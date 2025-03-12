import { type Context, Effect, Layer, Queue, Stream } from "effect"


export interface FailureHandler<E> {
    readonly failures: Stream.Stream<E>
    readonly queue: Queue.Queue<E>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, E = never,
>() => Effect.Tag(id)<Self, FailureHandler<E>>()

export const layer = <Self, Id extends string, E>(
    tag: Context.TagClass<Self, Id, FailureHandler<E>>
): Layer.Layer<Self> => Layer.effect(tag, Queue.unbounded<E>().pipe(
    Effect.map(queue => ({
        failures: Stream.fromQueue(queue),
        queue,
    }))
))
