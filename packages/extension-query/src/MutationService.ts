import type * as AsyncData from "@typed/async-data"
import { Effect, type Fiber, type Stream, type SubscriptionRef } from "effect"


export interface MutationService<K extends readonly unknown[], A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly mutate: (...key: K) => Effect.Effect<AsyncData.Success<A> | AsyncData.Failure<E>>
    readonly forkMutate: (...key: K) => Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never,
>() => Effect.Tag(id)<Self, MutationService<K, A, E>>()
