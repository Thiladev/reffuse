import { Effect, Fiber, Option, type Ref, type SubscriptionRef } from "effect"
import * as AsyncData from "@typed/async-data"


export interface QueryRunner<A, E, R> {
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void>>>

    readonly interrupt: Effect.Effect<void>
    readonly fetch: Effect.Effect<void>
    readonly refetch: Effect.Effect<void>
}


export class Query<A, E, R> {
    constructor(
        private readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>,
        private readonly fiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void>>>,
    ) {}

    private run(effect: Effect.Effect<A, E, R>) {

    }

    // interrupt(): Effect.Effect<void> {
    //     return this.fiberRef.pipe(
    //         Effect.flatMap(Option.match({
    //             onSome: Fiber.interrupt,
    //             onNone: () => Effect.void,
    //         }))
    //     )
    // }



    fetch = Effect.gen(this, function*() {
        yield* this.interrupt()
    })
}
