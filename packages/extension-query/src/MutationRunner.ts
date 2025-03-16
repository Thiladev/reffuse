import * as AsyncData from "@typed/async-data"
import { type Context, Effect, Ref, SubscriptionRef } from "effect"
import type * as QueryClient from "./QueryClient.js"


export interface MutationRunner<K extends readonly unknown[], A, E, R> {
    readonly context: Context.Context<R>
    readonly stateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly mutate: (...key: K) => Effect.Effect<A, E>
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

    const mutate = (...key: K) => QueryClient.pipe(
        Effect.flatMap(client => client.ErrorHandler),
        Effect.flatMap(errorHandler => Ref.set(stateRef, AsyncData.loading()).pipe(
            Effect.andThen(mutation(key)),
            errorHandler.handle,
            Effect.tapErrorCause(c => Ref.set(stateRef, AsyncData.failure(c))),
            Effect.tap(v => Ref.set(stateRef, AsyncData.success(v))),
        )),

        Effect.provide(context),
    )

    return {
        context,
        stateRef,
        mutate,
    }
})
