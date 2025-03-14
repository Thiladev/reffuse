import { BrowserStream } from "@effect/platform-browser"
import * as AsyncData from "@typed/async-data"
import { type Cause, type Context, Effect, Fiber, identity, Option, Ref, type Scope, Stream, SubscriptionRef } from "effect"
import type * as QueryClient from "./QueryClient.js"


export interface QueryRunner<K extends readonly unknown[], A, E, R> {
    readonly context: Context.Context<R>

    readonly latestKeyRef: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>>

    readonly forkInterrupt: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly forkFetch: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly forkRefresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>

    readonly fetchOnKeyChange: Effect.Effect<void, Cause.NoSuchElementException, Scope.Scope>
    readonly refreshOnWindowFocus: Effect.Effect<void>
}


export interface MakeProps<EH, K extends readonly unknown[], A, E, HandledE, R> {
    readonly QueryClient: QueryClient.Tag<EH, HandledE>
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>
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
    R | QueryClient.QueryClient<EH, HandledE> | EH
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.QueryClient<EH, HandledE> | EH>()

    const latestKeyRef = yield* SubscriptionRef.make(Option.none<K>())
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, Exclude<E, HandledE>>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>())

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

    const run = QueryClient.pipe(
        Effect.flatMap(client => client.ErrorHandler),
        Effect.flatMap(errorHandler => latestKeyRef.pipe(
            Effect.flatMap(identity),
            Effect.flatMap(key => query(key).pipe(
                errorHandler.handle,
                Effect.matchCauseEffect({
                    onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                    onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
                }),
            )),
        )),

        Effect.provide(context),
    )

    const forkFetch = interrupt.pipe(
        Effect.andThen(Ref.set(stateRef, AsyncData.loading()).pipe(
            Effect.andThen(run),
            Effect.fork,
        )),

        Effect.flatMap(fiber =>
            Ref.set(fiberRef, Option.some(fiber)).pipe(
                Effect.andThen(Fiber.join(fiber)),
                Effect.andThen(Ref.set(fiberRef, Option.none())),
            )
        ),

        Effect.forkDaemon,
    )

    const forkRefresh = interrupt.pipe(
        Effect.andThen(Ref.update(stateRef, previous => {
            if (AsyncData.isSuccess(previous) || AsyncData.isFailure(previous))
                return AsyncData.refreshing(previous)
            if (AsyncData.isRefreshing(previous))
                return AsyncData.refreshing(previous.previous)
            return AsyncData.loading()
        }).pipe(
            Effect.andThen(run),
            Effect.fork,
        )),

        Effect.flatMap(fiber =>
            Ref.set(fiberRef, Option.some(fiber)).pipe(
                Effect.andThen(Fiber.join(fiber)),
                Effect.andThen(Ref.set(fiberRef, Option.none())),
            )
        ),

        Effect.forkDaemon,
    )

    const fetchOnKeyChange = Effect.addFinalizer(() => interrupt).pipe(
        Effect.andThen(Stream.runForEach(key, latestKey =>
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
