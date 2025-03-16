import { type Cause, Context, Effect, Layer, Queue, Stream } from "effect"
import type { Mutable } from "effect/Types"


export interface ErrorHandler<E> {
    readonly errors: Stream.Stream<Cause.Cause<E>>
    readonly handle: <A, SelfE, R>(self: Effect.Effect<A, SelfE, R>) => Effect.Effect<A, Exclude<SelfE, E>, R>
}

export type Error<T> = T extends ErrorHandler<infer E> ? E : never


export interface ServiceResult<Self, Id extends string, E> extends Context.TagClass<Self, Id, ErrorHandler<E>> {
    readonly Live: Layer.Layer<Self>
}

export const Service = <const Id extends string>(id: Id) => (
    <Self, E = never>(): ServiceResult<Self, Id, E> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, Id, E>
        (TagClass as Mutable<typeof TagClass>).Live = Layer.effect(TagClass, Effect.gen(function*() {
            const queue = yield* Queue.unbounded<Cause.Cause<E>>()
            const errors = Stream.fromQueue(queue)

            const handle = <A, SelfE, R>(
                self: Effect.Effect<A, SelfE, R>
            ) => Effect.tapErrorCause(self, cause =>
                Queue.offer(queue, cause as Cause.Cause<E>)
            ) as Effect.Effect<A, Exclude<SelfE, E>, R>

            return { errors, handle }
        }))
        return TagClass
    }
)


export class DefaultErrorHandler extends Service("@reffuse/extension-query/DefaultErrorHandler")<DefaultErrorHandler>() {}
