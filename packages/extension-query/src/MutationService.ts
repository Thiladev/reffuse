import type * as AsyncData from "@typed/async-data"
import { Effect, type Fiber, type SubscriptionRef } from "effect"


export interface MutationService<K extends readonly unknown[], A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly mutate: (...key: K) => Effect.Effect<A, E>
    readonly forkMutate: (...key: K) => Effect.Effect<Fiber.RuntimeFiber<A, E>>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never,
>() => Effect.Tag(id)<Self, MutationService<K, A, E>>()
