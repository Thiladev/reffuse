import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, Option, Ref } from "effect"
import * as React from "react"
import { useState } from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"


export interface UseQueryProps<A, E, R> {
    effect: () => Effect.Effect<A, E, R>
    readonly deps: React.DependencyList
}

export interface UseQueryResult<A, E, R> {
    readonly state: AsyncData.AsyncData<A, E>
    readonly refresh: Effect.Effect<void, never, R>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E, R> {
        const fiberRef = this.useRef(Option.none<Fiber.Fiber<void, never>>())
        const [state, setState] = useState(AsyncData.noData<A, E>())

        const interruptRunningQuery = React.useMemo(() => fiberRef.pipe(
            Effect.flatMap(Option.match({
                onSome: Fiber.interrupt,
                onNone: () => Effect.void,
            }))
        ), [])

        const runQuery = React.useMemo(() => props.effect().pipe(
            Effect.matchCause({
                onSuccess: v => setState(AsyncData.success(v)),
                onFailure: c => setState(AsyncData.failure(c)),
            })
        ), props.deps)

        const refresh = React.useMemo(() => interruptRunningQuery.pipe(
            Effect.andThen(Effect.sync(() => setState(prev =>
                AsyncData.isSuccess(prev) || AsyncData.isFailure(prev)
                    ? AsyncData.refreshing(prev)
                    : AsyncData.loading()
            ))),
            Effect.andThen(runQuery),
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [runQuery])

        this.useEffect(() => interruptRunningQuery.pipe(
            Effect.andThen(Effect.sync(() => setState(AsyncData.loading()))),
            Effect.andThen(runQuery),
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [runQuery])

        return { state, refresh }
    }
}))
