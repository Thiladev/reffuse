import type * as AsyncData from "@typed/async-data"
import { type Cause, Effect, type Fiber, type Option, type Stream, type SubscriptionRef } from "effect"
import * as QueryRunner from "./QueryRunner.js"


export interface QueryService<K extends readonly unknown[], A, E> {
    readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly forkRefresh: Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>, Cause.NoSuchElementException>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never
>() => Effect.Tag(id)<Self, QueryRunner.QueryRunner<K, A, E>>()
