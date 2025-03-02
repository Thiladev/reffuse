import * as AsyncData from "@typed/async-data"
import { Effect, Ref, SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryRunner from "./QueryRunner.js"


export interface UseQueryProps<A, E, R> {
    effect: () => Effect.Effect<A, E, R>
    readonly deps: React.DependencyList
}

export interface UseQueryResult<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<void>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E> {
        const runner = this.useMemo(() => QueryRunner.make(props.effect()), [])

        this.useFork(() => Effect.addFinalizer(() => runner.interrupt).pipe(
            Effect.andThen(Ref.set(runner.queryRef, props.effect())),
            Effect.andThen(runner.forkFetch),
        ), [runner, ...props.deps])

        return React.useMemo(() => ({
            state: runner.stateRef,
            refresh: runner.forkRefetch,
        }), [runner])
    }
}))


export * as QueryRunner from "./QueryRunner.js"
