import type * as AsyncData from "@typed/async-data"
import { type Cause, Effect, type Fiber, type Option, type Stream, type SubscriptionRef } from "effect"
import * as QueryRunner from "./QueryRunner.js"
import * as QueryProgress from "./QueryProgress.js"


export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never
>() => Effect.Tag(id)<Self, QueryRunner.QueryRunner<K, A, E>>()


export interface ServiceProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
    readonly options?: QueryRunner.RunOptions
}

export const Service = <Self>() => <
    const Id extends string,
    K extends readonly unknown[], A, E, R,
>(
    id: Id,
    props: ServiceProps<K, A, E, R>,
) =>
