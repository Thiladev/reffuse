import { Cause, Context, Effect, identity, Layer, Queue, Stream } from "effect"
import type { Mutable } from "effect/Types"


export interface QueryErrorHandler<FallbackA, HandledE> {
    readonly errors: Stream.Stream<Cause.Cause<HandledE>>
    readonly handle: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A | FallbackA, Exclude<E, HandledE>, R>
}

export type Fallback<T> = T extends QueryErrorHandler<infer A, any> ? A : never
export type Error<T> = T extends QueryErrorHandler<any, infer E> ? E : never


export interface ServiceResult<
    Self,
    Id extends string,
    FallbackA,
    HandledE,
> extends Context.TagClass<
    Self,
    Id,
    QueryErrorHandler<FallbackA, HandledE>
> {
    readonly Live: Layer.Layer<Self>
}

export const Service = <Self, HandledE = never>() => (
    <const Id extends string, FallbackA>(
        id: Id,
        f: (
            self: Effect.Effect<never, HandledE>,
            failure: (failure: HandledE) => Effect.Effect<never>,
            defect: (defect: unknown) => Effect.Effect<never>,
        ) => Effect.Effect<FallbackA>,
    ): ServiceResult<Self, Id, FallbackA, HandledE> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, Id, FallbackA, HandledE>

        (TagClass as Mutable<typeof TagClass>).Live = Layer.effect(TagClass, Effect.gen(function*() {
            const queue = yield* Queue.unbounded<Cause.Cause<HandledE>>()
            const errors = Stream.fromQueue(queue)

            const handle = <A, E, R>(
                self: Effect.Effect<A, E, R>
            ): Effect.Effect<A | FallbackA, Exclude<E, HandledE>, R> => f(
                self as unknown as Effect.Effect<never, HandledE, never>,
                (failure: HandledE) => Queue.offer(queue, Cause.fail(failure)).pipe(
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


export class DefaultQueryErrorHandler extends Service<DefaultQueryErrorHandler>()(
    "@reffuse/extension-query/DefaultQueryErrorHandler",
    identity,
) {}
