import { Cause, Context, Effect, identity, Layer, Queue, Stream } from "effect"
import type { Mutable } from "effect/Types"


export interface ErrorHandler<E> {
    readonly errors: Stream.Stream<Cause.Cause<E>>
    readonly handle: <A, SelfE extends E, R>(self: Effect.Effect<A, SelfE, R>) => Effect.Effect<A, Exclude<SelfE, E>, R>
}

export type Error<T> = T extends ErrorHandler<infer E> ? E : never


export interface ServiceResult<Self, Id extends string, E> extends Context.TagClass<Self, Id, ErrorHandler<E>> {
    readonly Live: Layer.Layer<Self>
}

export const Service = <Self, E = never>() => (
    <const Id extends string>(
        id: Id,
        f: <A, R>(
            self: Effect.Effect<A, E, R>,
            failure: (failure: E) => Effect.Effect<never>,
            defect: (defect: unknown) => Effect.Effect<never>,
        ) => Effect.Effect<A, never, R>,
    ): ServiceResult<Self, Id, E> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, Id, E>

        (TagClass as Mutable<typeof TagClass>).Live = Layer.effect(TagClass, Effect.gen(function*() {
            const queue = yield* Queue.unbounded<Cause.Cause<E>>()
            const errors = Stream.fromQueue(queue)

            const handle = <A, SelfE extends E, R>(
                self: Effect.Effect<A, SelfE, R>
            ): Effect.Effect<A, Exclude<SelfE, E>, R> => f(self,
                (failure: E) => Queue.offer(queue, Cause.fail(failure)).pipe(
                    Effect.andThen(Effect.failCause(Cause.empty))
                ),
                (defect: unknown) => Queue.offer(queue, Cause.die(defect)).pipe(
                    Effect.andThen(Effect.failCause(Cause.empty))
                ),
            )

            return { errors, handle }
        }))

        return TagClass
    }
)


export class DefaultErrorHandler extends Service<DefaultErrorHandler>()(
    "@reffuse/extension-query/DefaultErrorHandler",
    identity,
) {}
