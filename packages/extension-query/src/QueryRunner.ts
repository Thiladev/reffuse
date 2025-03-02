import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, flow, identity, Option, Ref, SubscriptionRef } from "effect"


export interface QueryRunner<A, E, R> {
    readonly queryRef: SubscriptionRef.SubscriptionRef<Effect.Effect<A, E, R>>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void>>>

    readonly interrupt: Effect.Effect<void>
    readonly forkFetch: Effect.Effect<void>
    readonly forkRefetch: Effect.Effect<void>
}


export const make = <A, E, R>(
    query: Effect.Effect<A, E, R>
): Effect.Effect<QueryRunner<A, E, R>, never, R> => Effect.gen(function*() {
    const context = yield* Effect.context<R>()

    const queryRef = yield* SubscriptionRef.make(query)
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, E>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.Fiber<void>>())

    const interrupt = fiberRef.pipe(
        Effect.flatMap(Option.match({
            onSome: flow(
                Fiber.interrupt,
                Effect.andThen(Ref.set(fiberRef, Option.none())),
            ),
            onNone: () => Effect.void,
        }))
    )

    const forkFetch = interrupt.pipe(
        Effect.andThen(Ref.set(stateRef, AsyncData.loading())),
        Effect.andThen(queryRef.pipe(Effect.flatMap(identity))),
        Effect.matchCauseEffect({
            onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
            onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
        }),
        Effect.provide(context),
        Effect.forkDaemon,

        Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
    )

    const forkRefetch = interrupt.pipe(
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
        Effect.forkDaemon,

        Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
    )

    return {
        queryRef,
        stateRef,
        fiberRef,
        interrupt,
        forkFetch,
        forkRefetch,
    }
})
