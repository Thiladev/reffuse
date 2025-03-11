import { Effect, type Queue, type Stream } from "effect"


export interface FailureHandler<E> {
    readonly failures: Stream.Stream<E>
    readonly queue: Queue.Queue<E>
}

export const Tag = <const Id extends string>(id: Id) => <
    Self, E = never,
>() => Effect.Tag(id)<Self, FailureHandler<E>>()
