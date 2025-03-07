import * as AsyncData from "@typed/async-data"
import { Array, Context, Effect, ExecutionStrategy, Fiber, Layer, Ref, Schema, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryRunner from "./QueryRunner.js"
import * as QueryService from "./QueryService.js"


export interface UseQueryProps<A, E, R> {
    readonly key: Stream.Stream<readonly unknown[]> | readonly unknown[]
    readonly query: () => Effect.Effect<A, E, R>
    readonly refreshOnWindowFocus?: boolean
}

export interface UseQueryResult<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void>>
    readonly layer: <Self, Id extends string>(
        tag: Context.TagClass<Self, Id, QueryService.QueryService<A, E>>
    ) => Layer.Layer<Self>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E> {
        const runner = this.useMemo(() => QueryRunner.make({
            query: props.query()
        }), [])

        const key = React.useMemo(() =>
            (Array.isArray as (self: unknown) => self is readonly unknown[])(props.key)
                ? props.key
                : props.key,
        [props.key])

        this.useEffect(
            () => Effect.addFinalizer(() => runner.forkInterrupt).pipe(
                Effect.andThen(Ref.set(runner.queryRef, props.query())),
                Effect.andThen(runner.forkFetch),
            ),

            [runner, ...(Array.isArray(props.key) ? props.key : [])],
            { finalizerExecutionStrategy: ExecutionStrategy.parallel },
        )

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
