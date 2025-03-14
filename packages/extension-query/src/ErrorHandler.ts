import { type Cause, type Context, Effect, Layer, Queue, Stream } from "effect"


export interface ErrorHandler<E> {
    readonly errors: Stream.Stream<Cause.Cause<E>>
    handle<A, SelfE, R>(self: Effect.Effect<A, SelfE | E, R>): Effect.Effect<A, SelfE, R>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, E = never,
>() => Effect.Tag(id)<Self, ErrorHandler<E>>()

export const layer = <Self, Id extends string, E>(
    tag: Context.TagClass<Self, Id, ErrorHandler<E>>
): Layer.Layer<Self> => Layer.effect(tag, Effect.gen(function*() {
    const queue = yield* Queue.unbounded<Cause.Cause<E>>()
    const errors = Stream.fromQueue(queue)

    const handle = <A, SelfE, R>(
        self: Effect.Effect<A, SelfE | E, R>
    ) => Effect.tapErrorCause(self, cause =>
        Queue.offer(queue, cause as Cause.Cause<E>)
    ) as Effect.Effect<A, SelfE, R>

    return { errors, handle }
}))
