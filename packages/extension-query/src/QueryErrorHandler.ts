import { Cause, Effect, PubSub, Stream } from "effect"


export interface QueryErrorHandler<FallbackA, HandledE> {
    readonly errors: Stream.Stream<Cause.Cause<HandledE>>
    readonly handle: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A | FallbackA, Exclude<E, HandledE>, R>
}

export type Fallback<T> = T extends QueryErrorHandler<infer A, any> ? A : never
export type Error<T> = T extends QueryErrorHandler<any, infer E> ? E : never


export const make = <HandledE = never>() => (
    <FallbackA>(
        f: (
            self: Effect.Effect<never, HandledE>,
            failure: (failure: HandledE) => Effect.Effect<never>,
            defect: (defect: unknown) => Effect.Effect<never>,
        ) => Effect.Effect<FallbackA>
    ): Effect.Effect<QueryErrorHandler<FallbackA, HandledE>> => Effect.gen(function*() {
        const pubsub = yield* PubSub.unbounded<Cause.Cause<HandledE>>()
        const errors = Stream.fromPubSub(pubsub)

        const handle = <A, E, R>(
            self: Effect.Effect<A, E, R>
        ): Effect.Effect<A | FallbackA, Exclude<E, HandledE>, R> => f(
            self as unknown as Effect.Effect<never, HandledE, never>,
            (failure: HandledE) => Effect.andThen(
                PubSub.publish(pubsub, Cause.fail(failure)),
                Effect.failCause(Cause.empty),
            ),
            (defect: unknown) => Effect.andThen(
                PubSub.publish(pubsub, Cause.die(defect)),
                Effect.failCause(Cause.empty),
            ),
        )

        return { errors, handle }
    })
)
