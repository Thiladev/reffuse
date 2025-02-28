import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, Option, Ref, Scope } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"


export interface UseQueryProps<A, E, R> {
    effect: () => Effect.Effect<A, E, R | Scope.Scope>
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
        const stateRef = this.useRef(AsyncData.noData<A, E>())

        const interruptRunningQuery = React.useMemo(() => fiberRef.pipe(
            Effect.flatMap(Option.match({
                onSome: Fiber.interrupt,
                onNone: () => Effect.void,
            }))
        ), [])

        const runQuery = React.useMemo(() => props.effect().pipe(
            Effect.matchCauseEffect({
                onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
                onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
            })
        ), props.deps)

        const refresh = React.useMemo(() => interruptRunningQuery.pipe(
            Effect.andThen(Ref.update(stateRef, prev =>
                AsyncData.isSuccess(prev) || AsyncData.isFailure(prev)
                    ? AsyncData.refreshing(prev)
                    : AsyncData.loading()
            )),
            Effect.andThen(runQuery),
            Effect.scoped,
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [runQuery])

        this.useEffect(() => interruptRunningQuery.pipe(
            Effect.andThen(Ref.set(stateRef, AsyncData.loading())),
            Effect.andThen(runQuery),
            Effect.scoped,
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [runQuery])

        const [state] = this.useRefState(stateRef)
        return { state, refresh }
    }
}))
