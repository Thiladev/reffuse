import { type Cause, type Context, Effect, Layer, Queue, Stream } from "effect"


export interface ErrorHandler<E> {
    readonly errors: Stream.Stream<Cause.Cause<E>>
    readonly handle: <A, SelfE, R>(self: Effect.Effect<A, SelfE, R>) => Effect.Effect<A, Exclude<SelfE, E>, R>
}

export type Error<T> = T extends ErrorHandler<infer E> ? E : never


export const Tag = <const Id extends string>(id: Id) => <
    Self, E = never,
>() => Effect.Tag(id)<Self, ErrorHandler<E>>()

export const layer = <Self, Id extends string, E>(
    tag: Context.TagClass<Self, Id, ErrorHandler<E>>
): Layer.Layer<Self> => Layer.effect(tag, Effect.gen(function*() {
    const queue = yield* Queue.unbounded<Cause.Cause<E>>()
    const errors = Stream.fromQueue(queue)

    const handle = <A, SelfE, R>(
        self: Effect.Effect<A, SelfE, R>
    ) => Effect.tapErrorCause(self, cause =>
        Queue.offer(queue, cause as Cause.Cause<E>)
    ) as Effect.Effect<A, Exclude<SelfE, E>, R>

    return { errors, handle }
}))


export class DefaultErrorHandler extends Tag("@reffuse/extension-query/DefaultErrorHandler")<DefaultErrorHandler>() {}
export const DefaultErrorHandlerLive = layer(DefaultErrorHandler)
