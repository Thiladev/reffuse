import type * as AsyncData from "@typed/async-data"
import { type Cause, Effect, type Fiber, type Option, type SubscriptionRef } from "effect"


export interface QueryService<K extends readonly unknown[], A, E> {
    readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never,
>() => Effect.Tag(id)<Self, QueryService<K, A, E>>()
