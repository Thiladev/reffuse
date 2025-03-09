import type * as AsyncData from "@typed/async-data"
import { type Cause, type Context, Effect, type Fiber, Layer, type Stream, type SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryRunner from "./QueryRunner.js"
import type * as QueryService from "./QueryService.js"


export interface UseQueryProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>
    readonly refreshOnWindowFocus?: boolean
}

export interface UseQueryResult<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void, Cause.NoSuchElementException>>
    readonly layer: <Self, Id extends string>(
        tag: Context.TagClass<Self, Id, QueryService.QueryService<A, E>>
    ) => Layer.Layer<Self>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<K extends readonly unknown[], A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<K, A, E, R>,
    ): UseQueryResult<A, E> {
        const runner = this.useMemo(() => QueryRunner.make({
            key: props.key,
            query: props.query,
        }), [props.key])

        this.useFork(() => runner.fetchOnKeyChange, [runner])

        this.useFork(() => (props.refreshOnWindowFocus ?? true)
            ? runner.refreshOnWindowFocus
            : Effect.void,
        [props.refreshOnWindowFocus, runner])

        return React.useMemo(() => ({
            state: runner.stateRef,
            refresh: runner.forkRefresh,

            layer: tag => Layer.succeed(tag, {
                state: runner.stateRef,
                refresh: runner.forkRefresh,
            }),
        }), [runner])
    }
}))
