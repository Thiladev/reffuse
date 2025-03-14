import type * as AsyncData from "@typed/async-data"
import { type Cause, type Context, Effect, type Fiber, Layer, type Option, type Stream, type SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryClient from "./QueryClient.js"
import * as QueryRunner from "./QueryRunner.js"
import type * as QueryService from "./QueryService.js"


export interface UseQueryProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>
    readonly refreshOnWindowFocus?: boolean
}

export interface UseQueryResult<K extends readonly unknown[], A, E> {
    readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>

    readonly layer: <Self, Id extends string>(
        tag: Context.TagClass<Self, Id, QueryService.QueryService<K, A, E>>
    ) => Layer.Layer<Self>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<EH, K extends readonly unknown[], A, E, HandledE, R>(
        this: ReffuseHelpers.ReffuseHelpers<R | QueryClient.QueryClient<EH, HandledE> | EH>,
        props: UseQueryProps<K, A, E, R>,
    ): UseQueryResult<K, A, Exclude<E, HandledE>> {
        const runner = this.useMemo(() => QueryRunner.make({
            QueryClient: QueryClient.makeTag<EH, HandledE>(),
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
            refresh: runner.forkRefresh,

            layer: tag => Layer.succeed(tag, {
                latestKey: runner.latestKeyRef,
                state: runner.stateRef,
                refresh: runner.forkRefresh,
            }),
        }), [runner])
    }
}))
