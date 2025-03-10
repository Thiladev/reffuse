import type * as AsyncData from "@typed/async-data"
import { type Cause, Effect, type Fiber, type Stream, type SubscriptionRef } from "effect"


export interface QueryService<K extends readonly unknown[], A, E> {
    readonly keyStream: Stream.Stream<K>
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never,
>() => Effect.Tag(id)<Self, QueryService<K, A, E>>()


// export interface LayerProps<A, E, R> {
//     readonly query: Effect.Effect<A, E, R>
// }

// export const layer = <Self, Id extends string, A, E, R>(
//     tag: Context.TagClass<Self, Id, QueryService<A, E>>,
//     props: LayerProps<A, E, R>,
// ): Layer.Layer<Self, never, R> => Layer.effect(tag, Effect.gen(function*() {
//     const runner = yield* QueryRunner.make({
//         query: props.query
//     })

//     return {
//         state: runner.stateRef,
//         refresh: runner.forkRefresh,
//     }
// }))
