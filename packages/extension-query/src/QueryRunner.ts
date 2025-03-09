import { BrowserStream } from "@effect/platform-browser"
import * as AsyncData from "@typed/async-data"
import { type Cause, Effect, Fiber, identity, Option, Ref, Scope, Stream, SubscriptionRef } from "effect"


export interface QueryRunner<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>

    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>>

    readonly forkInterrupt: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly forkFetch: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly forkRefresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>

    readonly fetchOnKeyChange: Effect.Effect<void, Cause.NoSuchElementException, Scope.Scope>
    readonly refreshOnWindowFocus: Effect.Effect<void>
}


export interface MakeProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>
}

export const make = <K extends readonly unknown[], A, E, R>(
    { key, query }: MakeProps<K, A, E, R>
): Effect.Effect<QueryRunner<K, A, E, R>, never, R> => Effect.gen(function*() {
    const context = yield* Effect.context<R>()

    const latestKeyRef = yield* SubscriptionRef.make(Option.none<K>())
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, E>())
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

    const forkFetch = interrupt.pipe(
        Effect.andThen(
            Ref.set(stateRef, AsyncData.loading()).pipe(
                Effect.andThen(latestKeyRef),
                Effect.flatMap(identity),
                Effect.flatMap(key => query(key).pipe(
                    Effect.matchCauseEffect({
                        onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                        onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
                    })
                )),

                Effect.provide(context),
                Effect.fork,
            )
        ),

        Effect.flatMap(fiber =>
            Ref.set(fiberRef, Option.some(fiber)).pipe(
                Effect.andThen(Fiber.join(fiber)),
                Effect.andThen(Ref.set(fiberRef, Option.none())),
            )
        ),

        Effect.forkDaemon,
    )

    const forkRefresh = interrupt.pipe(
        Effect.andThen(
            Ref.update(stateRef, previous => {
                if (AsyncData.isSuccess(previous) || AsyncData.isFailure(previous))
                    return AsyncData.refreshing(previous)
                if (AsyncData.isRefreshing(previous))
                    return AsyncData.refreshing(previous.previous)
                return AsyncData.loading()
            }).pipe(
                Effect.andThen(latestKeyRef),
                Effect.flatMap(identity),
                Effect.flatMap(key => query(key).pipe(
                    Effect.matchCauseEffect({
                        onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                        onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
                    })
                )),

                Effect.provide(context),
                Effect.fork,
            )
        ),

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
        key,
        query,

        stateRef,
        fiberRef,

        forkInterrupt,
        forkFetch,
        forkRefresh,

        fetchOnKeyChange,
        refreshOnWindowFocus,
    }
})
