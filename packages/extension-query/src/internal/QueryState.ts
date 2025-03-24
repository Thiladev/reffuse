import type * as AsyncData from "@typed/async-data"
import { Context, Effect, Layer } from "effect"


export interface QueryState<A, E> {
    readonly get: Effect.Effect<AsyncData.AsyncData<A, E>>
    readonly set: (value: AsyncData.AsyncData<A, E>) => Effect.Effect<void>
    readonly update: (f: (previous: AsyncData.AsyncData<A, E>) => AsyncData.AsyncData<A, E>) => Effect.Effect<void>
}

export const makeTag = <A, E>(): Context.Tag<QueryState<A, E>, QueryState<A, E>> => Context.GenericTag("@reffuse/query-extension/QueryState")

export const layer = <A, E>(
    tag: Context.Tag<QueryState<A, E>, QueryState<A, E>>,
    get: Effect.Effect<AsyncData.AsyncData<A, E>>,
    set: (value: AsyncData.AsyncData<A, E>) => Effect.Effect<void>,
): Layer.Layer<QueryState<A, E>> => Layer.succeed(tag, {
    get,
    set,
    update: f => get.pipe(
        Effect.map(f),
        Effect.flatMap(set),
    ),
})
