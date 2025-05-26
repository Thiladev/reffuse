import * as AsyncData from "@typed/async-data"
import { Effect, type Fiber, Queue, Ref, Stream, SubscriptionRef } from "effect"
import type * as QueryClient from "./QueryClient.js"
import * as QueryProgress from "./QueryProgress.js"
import { QueryState } from "./internal/index.js"


export interface MutationRunner<K extends readonly unknown[], A, E> {
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>

    readonly mutate: (...key: K) => Effect.Effect<AsyncData.Success<A> | AsyncData.Failure<E>>
    readonly forkMutate: (...key: K) => Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
}


export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never,
>() => Effect.Tag(id)<Self, MutationRunner<K, A, E>>()


export interface MakeProps<K extends readonly unknown[], A, FallbackA, E, HandledE, R> {
    readonly QueryClient: QueryClient.GenericTagClass<FallbackA, HandledE>
    readonly mutation: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
}

export const make = <K extends readonly unknown[], A, FallbackA, E, HandledE, R>(
    {
        QueryClient,
        mutation,
    }: MakeProps<K, A, FallbackA, E, HandledE, R>
): Effect.Effect<
    MutationRunner<K, A | FallbackA, Exclude<E, HandledE>>,
    never,
    R | QueryClient.TagClassShape<FallbackA, HandledE>
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.TagClassShape<FallbackA, HandledE>>()
    const globalStateRef = yield* SubscriptionRef.make(AsyncData.noData<A | FallbackA, Exclude<E, HandledE>>())

    const queryStateTag = QueryState.makeTag<A | FallbackA, Exclude<E, HandledE>>()

    const run = (key: K) => Effect.all([QueryClient, queryStateTag]).pipe(
        Effect.flatMap(([client, state]) => state.set(AsyncData.loading()).pipe(
            Effect.andThen(mutation(key)),
            client.errorHandler.handle,
            Effect.matchCauseEffect({
                onSuccess: v => Effect.tap(Effect.succeed(AsyncData.success(v)), state.set),
                onFailure: c => Effect.tap(Effect.succeed(AsyncData.failure(c)), state.set),
            }),
        )),

        Effect.provide(context),
        Effect.provide(QueryProgress.QueryProgress.Default),
    )

    const mutate = (...key: K) => Effect.provide(run(key), QueryState.layer(
        queryStateTag,
        globalStateRef,
        value => Ref.set(globalStateRef, value),
    ))

    const forkMutate = (...key: K) => Effect.all([
        Ref.make(AsyncData.noData<A | FallbackA, Exclude<E, HandledE>>()),
        Queue.unbounded<AsyncData.AsyncData<A | FallbackA, Exclude<E, HandledE>>>(),
    ]).pipe(
        Effect.flatMap(([stateRef, stateQueue]) =>
            Effect.addFinalizer(() => Queue.shutdown(stateQueue)).pipe(
                Effect.andThen(run(key)),
                Effect.scoped,
                Effect.forkDaemon,

                Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const),

                Effect.provide(QueryState.layer(
                    queryStateTag,
                    stateRef,
                    value => Queue.offer(stateQueue, value).pipe(
                        Effect.andThen(Ref.set(stateRef, value)),
                        Effect.andThen(Ref.set(globalStateRef, value)),
                    ),
                )),
            )
        )
    )

    return {
        context,
        stateRef: globalStateRef,

        mutate,
        forkMutate,
    }
})
