import type * as AsyncData from "@typed/async-data"
import { type Cause, type Context, Effect, type Fiber, Layer, type Option, type Stream, type SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseNamespace } from "reffuse"
import type * as MutationService from "./MutationService.js"
import * as QueryClient from "./QueryClient.js"
import type * as QueryProgress from "./QueryProgress.js"
import type * as QueryService from "./QueryService.js"
import { MutationRunner, QueryRunner } from "./internal/index.js"


export interface UseQueryProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
    readonly refreshOnWindowFocus?: boolean
}

export interface UseQueryResult<K extends readonly unknown[], A, E> {
    readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>

    readonly forkRefresh: Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>, Cause.NoSuchElementException>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>

    readonly layer: <Self, Id extends string>(
        tag: Context.TagClass<Self, Id, QueryService.QueryService<K, A, E>>
    ) => Layer.Layer<Self>
}


export interface UseMutationProps<K extends readonly unknown[], A, E, R> {
    readonly mutation: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
}

export interface UseMutationResult<K extends readonly unknown[], A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>

    readonly mutate: (...key: K) => Effect.Effect<AsyncData.Success<A> | AsyncData.Failure<E>>
    readonly forkMutate: (...key: K) => Effect.Effect<readonly [
        fiber: Fiber.RuntimeFiber<AsyncData.Success<A> | AsyncData.Failure<E>>,
        state: Stream.Stream<AsyncData.AsyncData<A, E>>,
    ]>

    readonly layer: <Self, Id extends string>(
        tag: Context.TagClass<Self, Id, MutationService.MutationService<K, A, E>>
    ) => Layer.Layer<Self>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<
        QK extends readonly unknown[],
        QA,
        FallbackA,
        QE,
        HandledE,
        QR extends R,
        R,
    >(
        this: ReffuseNamespace.ReffuseNamespace<R | QueryClient.TagClassShape<FallbackA, HandledE>>,
        props: UseQueryProps<QK, QA, QE, QR>,
    ): UseQueryResult<QK, QA | FallbackA, Exclude<QE, HandledE>> {
        const runner = this.useMemo(() => QueryRunner.make({
            QueryClient: QueryClient.makeGenericTagClass<FallbackA, HandledE>(),
            key: props.key,
            query: props.query,
        }), [props.key])

        this.useFork(() => runner.fetchOnKeyChange, [runner])

        this.useFork(() => (props.refreshOnWindowFocus ?? true)
            ? runner.refreshOnWindowFocus
            : Effect.void,
        [props.refreshOnWindowFocus, runner])

        return React.useMemo(() => ({
            latestKey: runner.latestKeyRef,
            state: runner.stateRef,

            forkRefresh: runner.forkRefresh,

            layer: tag => Layer.succeed(tag, {
                latestKey: runner.latestKeyRef,
                state: runner.stateRef,
                forkRefresh: runner.forkRefresh,
            }),
        }), [runner])
    },

    useMutation<
        QK extends readonly unknown[],
        QA,
        FallbackA,
        QE,
        HandledE,
        QR extends R,
        R,
    >(
        this: ReffuseNamespace.ReffuseNamespace<R | QueryClient.TagClassShape<FallbackA, HandledE>>,
        props: UseMutationProps<QK, QA, QE, QR>,
    ): UseMutationResult<QK, QA | FallbackA, Exclude<QE, HandledE>> {
        const runner = this.useMemo(() => MutationRunner.make({
            QueryClient: QueryClient.makeGenericTagClass<FallbackA, HandledE>(),
            mutation: props.mutation,
        }), [])

        return React.useMemo(() => ({
            state: runner.stateRef,

            mutate: runner.mutate,
            forkMutate: runner.forkMutate,

            layer: tag => Layer.succeed(tag, {
                state: runner.stateRef,
                mutate: runner.mutate,
                forkMutate: runner.forkMutate,
            }),
        }), [runner])
    },
}))
