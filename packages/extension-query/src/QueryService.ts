import * as AsyncData from "@typed/async-data"
import { Context, Effect, Fiber, Layer, SubscriptionRef } from "effect"
import * as QueryRunner from "./QueryRunner.js"


export interface QueryService<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void>>
}


export const Tag = <const Id extends string>(id: Id) => <
    Self, A, E = never,
>() => Effect.Tag(id)<Self, QueryService<A, E>>()

export const layer = <Self, Id extends string, A, E, R>(
    tag: Context.TagClass<Self, Id, QueryService<A, E>>,
    query: Effect.Effect<A, E, R>,
): Layer.Layer<Self, never, R> => Layer.effect(tag, Effect.gen(function*() {
    const runner = yield* QueryRunner.make(query)

    return {
        state: runner.stateRef,
        refresh: runner.forkRefresh,
    }
}))
