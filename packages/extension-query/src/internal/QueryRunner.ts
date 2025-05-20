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
}


export interface MakeProps<K extends readonly unknown[], A, FallbackA, E, HandledE, R> {
    readonly QueryClient: QueryClient.GenericTagClass<FallbackA, HandledE>
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
}

export const make = <K extends readonly unknown[], A, FallbackA, E, HandledE, R>(
    {
        QueryClient,
        key,
        query,
    }: MakeProps<K, A, FallbackA, E, HandledE, R>
): Effect.Effect<
    QueryRunner<K, A | FallbackA, Exclude<E, HandledE>, R>,
    never,
    R | QueryClient.TagClassShape<FallbackA, HandledE>
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.TagClassShape<FallbackA, HandledE>>()

    const latestKeyRef = yield* SubscriptionRef.make(Option.none<K>())
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A | FallbackA, Exclude<E, HandledE>>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.RuntimeFiber<
        AsyncData.Success<A | FallbackA> | AsyncData.Failure<Exclude<E, HandledE>>,
        Cause.NoSuchElementException
    >>())

    const queryStateTag = QueryState.makeTag<A | FallbackA, Exclude<E, HandledE>>()

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

    const run = Effect.Do.pipe(
        Effect.bind("state", () => queryStateTag),
        Effect.bind("client", () => QueryClient),
        Effect.bind("latestKey", () => latestKeyRef.pipe(Effect.flatMap(identity))),

        Effect.flatMap(({ state, client, latestKey }) => query(latestKey).pipe(
            client.errorHandler.handle,
            Effect.matchCauseEffect({
                onSuccess: v => Effect.succeed(AsyncData.success(v)).pipe(
                    Effect.tap(state.set)
                ),
                onFailure: c => Effect.succeed(AsyncData.failure(c)).pipe(
                    Effect.tap(state.set)
                ),
            }),
        )),

        Effect.provide(context),
        Effect.provide(QueryProgress.QueryProgress.Live),
    )

    const forkFetch = Queue.unbounded<AsyncData.AsyncData<A | FallbackA, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => queryStateTag.pipe(
            Effect.flatMap(state => interrupt.pipe(
                Effect.andThen(Effect.addFinalizer(() => Ref.set(fiberRef, Option.none()).pipe(
                    Effect.andThen(Queue.shutdown(stateQueue))
                )).pipe(
                    Effect.andThen(state.set(AsyncData.loading())),
                    Effect.andThen(run),
                    Effect.scoped,
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
        }))
    )

    const forkRefresh = Queue.unbounded<AsyncData.AsyncData<A | FallbackA, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => interrupt.pipe(
            Effect.andThen(Effect.addFinalizer(() => Ref.set(fiberRef, Option.none()).pipe(
                Effect.andThen(Queue.shutdown(stateQueue))
            )).pipe(
                Effect.andThen(setInitialRefreshState),
                Effect.andThen(run),
                Effect.scoped,
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

    return {
        context,

        latestKeyRef,
        stateRef,
        fiberRef,

        forkInterrupt,
        forkFetch,
        forkRefresh,

        fetchOnKeyChange,
    }
})


export interface RunOptions {
    readonly refreshOnWindowFocus?: boolean
}

export const run = <K extends readonly unknown[], A, E, R>(
    self: QueryRunner<K, A, E, R>,
    options?: RunOptions,
): Effect.Effect<void, Error | Cause.NoSuchElementException, Scope.Scope> => Effect.gen(function*() {
    if (options?.refreshOnWindowFocus ?? false)
        yield* Effect.tryPromise({
            try: () => import("@effect/platform-browser/BrowserStream"),
            catch: () => new Error("Could not import @effect/platform-browser, make sure it is installed as it is a requirement for 'refreshOnWindowFocus'."),
        }).pipe(
            Effect.flatMap(BrowserStream => Effect.forkScoped(
                Stream.runForEach(BrowserStream.fromEventListenerWindow("focus"), () => self.forkRefresh)
            ))
        )

    yield* self.fetchOnKeyChange
})
