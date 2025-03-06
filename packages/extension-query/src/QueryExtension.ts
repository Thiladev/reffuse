import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, Ref, SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryRunner from "./QueryRunner.js"


export interface UseQueryProps<A, E, R> {
    readonly query: () => Effect.Effect<A, E, R>
    readonly key: React.DependencyList
}

export interface UseQueryResult<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly refresh: Effect.Effect<Fiber.RuntimeFiber<void>>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E> {
        const runSync = this.useRunSync()

        const runner = this.useMemo(() => QueryRunner.make({
            query: props.query()
        }), [])

        React.useEffect(() => {
            Ref.set(runner.queryRef, props.query()).pipe(
                Effect.andThen(runner.forkFetch),
                runSync,
            )

            return () => { runSync(runner.forkInterrupt) }
        }, [runner, ...props.key])

        this.useFork(() => runner.refreshOnWindowFocus, [runner])

        return React.useMemo(() => ({
            state: runner.stateRef,
            refresh: runner.forkRefresh,
        }), [runner])
    }
}))
