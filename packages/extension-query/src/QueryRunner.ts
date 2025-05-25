import { BrowserStream } from "@effect/platform-browser"
import * as AsyncData from "@typed/async-data"
import { type Cause, Effect, Fiber, identity, Option, Queue, Ref, type Scope, Stream, SubscriptionRef } from "effect"
import type * as QueryClient from "./QueryClient.js"
import * as QueryProgress from "./QueryProgress.js"
import { QueryState } from "./internal/index.js"


export interface QueryRunner<K extends readonly unknown[], A, E> {
    readonly queryKey: Stream.Stream<K>
    readonly latestKeyValueRef: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.RuntimeFiber<
        AsyncData.Success<A> | AsyncData.Failure<E>,
        Cause.NoSuchElementException
    >>>

    readonly interrupt: Effect.Effect<void>
    readonly forkInterrupt: Effect.Effect<Fiber.RuntimeFiber<void>>
    readonly forkFetch: (keyValue: K) => Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
    readonly forkRefresh: Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>, Cause.NoSuchElementException>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
}


export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never
>() => Effect.Tag(id)<Self, QueryRunner<K, A, E>>()


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
    QueryRunner<K, A | FallbackA, Exclude<E, HandledE>>,
    never,
    R | QueryClient.TagClassShape<FallbackA, HandledE>
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.TagClassShape<FallbackA, HandledE>>()

    const latestKeyValueRef = yield* SubscriptionRef.make(Option.none<K>())
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A | FallbackA, Exclude<E, HandledE>>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.RuntimeFiber<
        AsyncData.Success<A | FallbackA> | AsyncData.Failure<Exclude<E, HandledE>>,
        Cause.NoSuchElementException
    >>())

    const queryStateTag = QueryState.makeTag<A | FallbackA, Exclude<E, HandledE>>()

    const interrupt = Effect.flatMap(fiberRef, Option.match({
        onSome: fiber => Ref.set(fiberRef, Option.none()).pipe(
            Effect.andThen(Fiber.interrupt(fiber))
        ),
        onNone: () => Effect.void,
    }))

    const forkInterrupt = Effect.flatMap(fiberRef, Option.match({
        onSome: fiber => Ref.set(fiberRef, Option.none()).pipe(
            Effect.andThen(Fiber.interrupt(fiber).pipe(
                Effect.asVoid,
                Effect.forkDaemon,
            ))
        ),
        onNone: () => Effect.forkDaemon(Effect.void),
    }))

    const run = (keyValue: K) => Effect.all([QueryClient, queryStateTag]).pipe(
        Effect.flatMap(([client, state]) => Ref.set(latestKeyValueRef, Option.some(keyValue)).pipe(
            Effect.andThen(query(keyValue)),
            client.errorHandler.handle,
            Effect.matchCauseEffect({
                onSuccess: v => Effect.tap(Effect.succeed(AsyncData.success(v)), state.set),
                onFailure: c => Effect.tap(Effect.succeed(AsyncData.failure(c)), state.set),
            }),
        )),

        Effect.provide(context),
        Effect.provide(QueryProgress.QueryProgress.Default),
    )

    const forkFetch = (keyValue: K) => Queue.unbounded<AsyncData.AsyncData<A | FallbackA, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => queryStateTag.pipe(
            Effect.flatMap(state => interrupt.pipe(
                Effect.andThen(
                    Effect.addFinalizer(() => Effect.andThen(
                        Ref.set(fiberRef, Option.none()),
                        Queue.shutdown(stateQueue),
                    )).pipe(
                        Effect.andThen(state.set(AsyncData.loading())),
                        Effect.andThen(run(keyValue)),
                        Effect.scoped,
                        Effect.forkDaemon,
                    )
                ),

                Effect.tap(fiber => Ref.set(fiberRef, Option.some(fiber))),
                Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const),
            )),

            Effect.provide(QueryState.layer(
                queryStateTag,
                stateRef,
                value => Effect.andThen(
                    Queue.offer(stateQueue, value),
                    Ref.set(stateRef, value),
                ),
            )),
        ))
    )

    const setInitialRefreshState = Effect.flatMap(queryStateTag, state => state.update(previous => {
        if (AsyncData.isSuccess(previous) || AsyncData.isFailure(previous))
            return AsyncData.refreshing(previous)
        if (AsyncData.isRefreshing(previous))
            return AsyncData.refreshing(previous.previous)
        return AsyncData.loading()
    }))

    const forkRefresh = Queue.unbounded<AsyncData.AsyncData<A | FallbackA, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue => interrupt.pipe(
            Effect.andThen(
                Effect.addFinalizer(() => Effect.andThen(
                    Ref.set(fiberRef, Option.none()),
                    Queue.shutdown(stateQueue),
                )).pipe(
                    Effect.andThen(setInitialRefreshState),
                    Effect.andThen(latestKeyValueRef.pipe(
                        Effect.flatMap(identity),
                        Effect.flatMap(run),
                    )),
                    Effect.scoped,
                    Effect.forkDaemon,
                )
            ),

            Effect.tap(fiber => Ref.set(fiberRef, Option.some(fiber))),
            Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const),

            Effect.provide(QueryState.layer(
                queryStateTag,
                stateRef,
                value => Effect.andThen(
                    Queue.offer(stateQueue, value),
                    Ref.set(stateRef, value),
                ),
            )),
        ))
    )

    return {
        queryKey: key,
        latestKeyValueRef,
        stateRef,
        fiberRef,

        interrupt,
        forkInterrupt,
        forkFetch,
        forkRefresh,
    }
})


export interface RunOptions {
    readonly refreshOnWindowFocus?: boolean
}

export const run = <K extends readonly unknown[], A, E>(
    self: QueryRunner<K, A, E>,
    options?: RunOptions,
): Effect.Effect<void, never, Scope.Scope> => Effect.gen(function*() {
    if (typeof window !== "undefined" && (options?.refreshOnWindowFocus ?? true))
        yield* Effect.forkScoped(
            Stream.runForEach(BrowserStream.fromEventListenerWindow("focus"), () => self.forkRefresh)
        )

    yield* Effect.addFinalizer(() => self.interrupt)
    yield* Stream.runForEach(Stream.changes(self.queryKey), latestKey => self.forkFetch(latestKey))
})
