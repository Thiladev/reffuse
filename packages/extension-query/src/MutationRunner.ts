import * as AsyncData from "@typed/async-data"
import { type Context, Effect, type Fiber, Queue, Ref, Stream, SubscriptionRef } from "effect"
import type * as QueryClient from "./QueryClient.js"


export interface MutationRunner<K extends readonly unknown[], A, E, R> {
    readonly context: Context.Context<R>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>

    readonly mutate: (...key: K) => Effect.Effect<AsyncData.Success<A> | AsyncData.Failure<E>>
    readonly forkMutate: (...key: K) => Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>
}


export interface MakeProps<EH, K extends readonly unknown[], A, E, HandledE, R> {
    readonly QueryClient: QueryClient.GenericTagClass<EH, HandledE>
    readonly mutation: (key: K) => Effect.Effect<A, E, R>
}

export const make = <EH, K extends readonly unknown[], A, E, HandledE, R>(
    {
        QueryClient,
        mutation,
    }: MakeProps<EH, K, A, E, HandledE, R>
): Effect.Effect<
    MutationRunner<K, A, Exclude<E, HandledE>, R>,
    never,
    R | QueryClient.TagClassShape<EH, HandledE> | EH
> => Effect.gen(function*() {
    const context = yield* Effect.context<R | QueryClient.TagClassShape<EH, HandledE> | EH>()
    const stateRef = yield* SubscriptionRef.make(AsyncData.noData<A, Exclude<E, HandledE>>())

    const run = (
        key: K,
        setState: (value: AsyncData.AsyncData<A, Exclude<E, HandledE>>) => Effect.Effect<void>,
    ) => QueryClient.pipe(
        Effect.flatMap(client => client.ErrorHandler),
        Effect.flatMap(errorHandler => setState(AsyncData.loading()).pipe(
            Effect.andThen(mutation(key)),
            errorHandler.handle,
            Effect.matchCauseEffect({
                onSuccess: v => Effect.succeed(AsyncData.success(v)).pipe(
                    Effect.tap(setState)
                ),
                onFailure: c => Effect.succeed(AsyncData.failure(c)).pipe(
                    Effect.tap(setState)
                ),
            }),
        )),

        Effect.provide(context),
    )

    const mutate = (...key: K) => run(key, value => Ref.set(stateRef, value))

    const forkMutate = (...key: K) => Queue.unbounded<AsyncData.AsyncData<A, Exclude<E, HandledE>>>().pipe(
        Effect.flatMap(stateQueue =>
            run(
                key,
                value => Ref.set(stateRef, value).pipe(
                    Effect.andThen(Queue.offer(stateQueue, value))
                ),
            ).pipe(
                Effect.tap(() => Queue.shutdown(stateQueue)),
                Effect.forkDaemon,
                Effect.map(fiber => [fiber, Stream.fromQueue(stateQueue)] as const)
            )
        )
    )


    return {
        context,
        stateRef,

        mutate,
        forkMutate,
    }
})
