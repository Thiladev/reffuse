import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, identity, Option, Ref, SubscriptionRef } from "effect"


export interface QueryRunner<A, E, R> {
    readonly queryRef: SubscriptionRef.SubscriptionRef<Effect.Effect<A, E, R>>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.RuntimeFiber<void>>>

    readonly forkInterrupt: Effect.Effect<Fiber.RuntimeFiber<void>>
    readonly forkFetch: Effect.Effect<Fiber.RuntimeFiber<void>>
    readonly forkRefresh: Effect.Effect<Fiber.RuntimeFiber<void>>
}


export const make = <A, E, R>(
    query: Effect.Effect<A, E, R>
): Effect.Effect<QueryRunner<A, E, R>, never, R> => Effect.gen(function*() {
    const context = yield* Effect.context<R>()

    const queryRef = yield* SubscriptionRef.make(query)
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, E>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.RuntimeFiber<void>>())

    const interrupt = fiberRef.pipe(
        Effect.flatMap(Option.match({
            onSome: Fiber.interrupt,
            onNone: () => Effect.void,
        }))
    )

    const forkInterrupt = Effect.forkDaemon(interrupt)

    const forkFetch = interrupt.pipe(
        Effect.andThen(
            Effect.addFinalizer(() => Ref.set(fiberRef, Option.none())).pipe(
                Effect.andThen(Ref.set(stateRef, AsyncData.loading())),
                Effect.andThen(queryRef.pipe(Effect.flatMap(identity))),
                Effect.matchCauseEffect({
                    onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                    onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
                }),

                Effect.provide(context),
                Effect.scoped,
                Effect.fork,
            )
        ),

        Effect.flatMap(fiber =>
            Ref.set(fiberRef, Option.some(fiber)).pipe(
                Effect.andThen(Fiber.join(fiber))
            )
        ),

        Effect.forkDaemon,
    )

    const forkRefresh = interrupt.pipe(
        Effect.andThen(
            Effect.addFinalizer(() => Ref.set(fiberRef, Option.none())).pipe(
                Effect.andThen(Ref.update(stateRef, previous => {
                    if (AsyncData.isSuccess(previous) || AsyncData.isFailure(previous))
                        return AsyncData.refreshing(previous)
                    if (AsyncData.isRefreshing(previous))
                        return AsyncData.refreshing(previous.previous)
                    return AsyncData.loading()
                })),
                Effect.andThen(queryRef.pipe(Effect.flatMap(identity))),
                Effect.matchCauseEffect({
                    onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                    onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
                }),

                Effect.provide(context),
                Effect.scoped,
                Effect.fork,
            )
        ),

        Effect.flatMap(fiber =>
            Ref.set(fiberRef, Option.some(fiber)).pipe(
                Effect.andThen(Fiber.join(fiber))
            )
        ),

        Effect.forkDaemon,
    )

    return {
        queryRef,
        stateRef,
        fiberRef,

        forkInterrupt,
        forkFetch,
        forkRefresh,
    }
})
