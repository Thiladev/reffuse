import { Effect, Fiber, Option, SubscriptionRef, type Ref } from "effect"
import * as AsyncData from "@typed/async-data"


export interface QueryRunner<A, E, R> {
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void>>>

    readonly interrupt: Effect.Effect<void>
    fetch(effect: Effect.Effect<A, E, R>): Effect.Effect<void>
    // refetch(effect: Effect.Effect<A, E, R>): Effect.Effect<void>
}

export const make = Effect.fnUntraced(function*<A, E, R>(): Effect.Effect<QueryRunner<A, E, R>> {
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, E>())
    const fiberRef = yield* SubscriptionRef.make(Option.none<Fiber.Fiber<void>>())

    const interrupt = fiberRef.pipe(
        Effect.flatMap(Option.match({
            onSome: Fiber.interrupt,
            onNone: () => Effect.void,
        }))
    )

    const fetch = Effect.fnUntraced(function*(effect: Effect.Effect<A, E, R>) {

    })

    return {
        stateRef,
        fiberRef,
        interrupt,
        fetch,
    }
})
