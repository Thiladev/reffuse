import { BrowserStream } from "@effect/platform-browser"
import * as AsyncData from "@typed/async-data"
import { type Cause, type Context, Effect, Fiber, identity, Option, Queue, Ref, type Scope, Stream, SubscriptionRef } from "effect"
import type * as QueryClient from "../QueryClient.js"
import * as QueryProgress from "../QueryProgress.js"
import * as QueryState from "./QueryState.js"


export interface QueryRunner<K extends readonly unknown[], A, E, R> {
    readonly context: Context.Context<R>

    readonly latestKeyRef: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.RuntimeFiber<
        AsyncData.Success<A> | AsyncData.Failure<E>,
        Cause.NoSuchElementException
    >>>

    readonly forkInterrupt: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly forkFetch: Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>, Cause.NoSuchElementException>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
    readonly forkRefresh: Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>, Cause.NoSuchElementException>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>

    readonly fetchOnKeyChange: Effect.Effect<void, Cause.NoSuchElementException, Scope.Scope>
    readonly refreshOnWindowFocus: Effect.Effect<void>
}


export interface MakeProps<EH, K extends readonly unknown[], A, E, HandledE, R> {
    readonly QueryClient: QueryClient.GenericTagClass<EH, HandledE>
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
}

export const make = <EH, K extends readonly unknown[], A, E, HandledE, R>(
    {
        QueryClient,
        key,
        query,
    }: MakeProps<EH, K, A, E, HandledE, R>
): Effect.Effect<
    QueryRunner<K, A, Exclude<E, HandledE>, R>,
    never,
    R | QueryClient.TagClassShape<EH, HandledE> | EH
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.TagClassShape<EH, HandledE> | EH>()

    const latestKeyRef = yield* SubscriptionRef.make(Option.none<K>())
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, Exclude<E, HandledE>>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.RuntimeFiber<
        AsyncData.Success<A> | AsyncData.Failure<Exclude<E, HandledE>>,
        Cause.NoSuchElementException
    >>())

    const queryStateTag = QueryState.makeTag<A, Exclude<E, HandledE>>()

    const interrupt = fiberRef.pipe(
        Effect.flatMap(Option.match({
            onSome: fiber => Ref.set(fiberRef, Option.none()).pipe(
                Effect.andThen(Fiber.interrupt(fiber))
            ),
            onNone: () => Effect.void,
        }))
    )

    const forkInterrupt = fiberRef.pipe(
        Effect.flatMap(Option.match({
            onSome: fiber => Ref.set(fiberRef, Option.none()).pipe(
                Effect.andThen(Fiber.interrupt(fiber).pipe(
                    Effect.asVoid,
                    Effect.forkDaemon,
                ))
            ),
            onNone: () => Effect.forkDaemon(Effect.void),
        }))
    )

    const run = Effect.all([
        queryStateTag,
        QueryClient.pipe(Effect.flatMap(client => client.ErrorHandler)),
    ]).pipe(
        Effect.flatMap(([state, errorHandler]) => latestKeyRef.pipe(
            Effect.flatMap(identity),
            Effect.flatMap(key => query(key).pipe(
                errorHandler.handle,
                Effect.matchCauseEffect({
                    onSuccess: v => Effect.succeed(AsyncData.success(v)).pipe(
                        Effect.tap(state.set)
                    ),
                    onFailure: c => Effect.succeed(AsyncData.failure(c)).pipe(
                        Effect.tap(state.set)
                    ),
                }),
            )),
        )),

        Effect.provide(context),
        Effect.provide(QueryProgress.QueryProgress.Live),
    )

    const forkFetch = Queue.unbounded<AsyncData.AsyncData<A, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => queryStateTag.pipe(
            Effect.flatMap(state => interrupt.pipe(
                Effect.andThen(state.set(AsyncData.loading()).pipe(
                    Effect.andThen(run),
                    Effect.tap(() => Ref.set(fiberRef, Option.none())),
                    Effect.forkDaemon,
                )),

                Effect.tap(fiber => Ref.set(fiberRef, Option.some(fiber))),
                Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const),
            )),

            Effect.provide(QueryState.layer(
                queryStateTag,
                stateRef,
                value => Queue.offer(stateQueue, value).pipe(
                    Effect.andThen(Ref.set(stateRef, value))
                ),
            )),
        ))
    )

    const setInitialRefreshState = queryStateTag.pipe(
        Effect.flatMap(state => state.update(previous => {
            if (AsyncData.isSuccess(previous) || AsyncData.isFailure(previous))
                return AsyncData.refreshing(previous)
            if (AsyncData.isRefreshing(previous))
                return AsyncData.refreshing(previous.previous)
            return AsyncData.loading()
        })),
    )

    const forkRefresh = Queue.unbounded<AsyncData.AsyncData<A, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => interrupt.pipe(
            Effect.andThen(setInitialRefreshState.pipe(
                Effect.andThen(run),
                Effect.tap(() => Ref.set(fiberRef, Option.none())),
                Effect.forkDaemon,
            )),

            Effect.tap(fiber => Ref.set(fiberRef, Option.some(fiber))),
            Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const),

            Effect.provide(QueryState.layer(
                queryStateTag,
                stateRef,
                value => Queue.offer(stateQueue, value).pipe(
                    Effect.andThen(Ref.set(stateRef, value))
                ),
            )),
        ))
    )

    const fetchOnKeyChange = Effect.addFinalizer(() => interrupt).pipe(
        Effect.andThen(Stream.runForEach(Stream.changes(key), latestKey =>
            Ref.set(latestKeyRef, Option.some(latestKey)).pipe(
                Effect.andThen(forkFetch)
            )
        ))
    )

    const refreshOnWindowFocus = Stream.runForEach(
        BrowserStream.fromEventListenerWindow("focus"),
        () => forkRefresh,
    )

    return {
        context,

        latestKeyRef,
        stateRef,
        fiberRef,

        forkInterrupt,
        forkFetch,
        forkRefresh,

        fetchOnKeyChange,
        refreshOnWindowFocus,
    }
})
