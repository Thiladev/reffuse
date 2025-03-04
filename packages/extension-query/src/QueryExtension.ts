import { BrowserStream } from "@effect/platform-browser"
import * as AsyncData from "@typed/async-data"
import { Console, Effect, Fiber, Ref, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"
import * as QueryRunner from "./QueryRunner.js"


export interface UseQueryProps<A, E, R> {
    effect: () => Effect.Effect<A, E, R>
    readonly deps: React.DependencyList
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
        const runner = this.useMemo(() => QueryRunner.make(props.effect()), [])

        this.useEffect(() => Effect.addFinalizer(() => runner.forkInterrupt).pipe(
            Effect.andThen(Ref.set(runner.queryRef, props.effect())),
            Effect.andThen(runner.forkFetch),
        ), [runner, ...props.deps])

        this.useFork(() => Stream.runForEach(
            BrowserStream.fromEventListenerWindow("focus"),
            () => Console.log("focus!"),
        ), [])

        return React.useMemo(() => ({
            state: runner.stateRef,
            refresh: runner.forkRefresh,
        }), [runner])
    }
}))
