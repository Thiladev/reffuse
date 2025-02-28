import * as AsyncData from "@typed/async-data"
import { Effect, Fiber, Option, Ref, Scope, SubscriptionRef } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"


export interface UseQueryProps<A, E, R> {
    effect: () => Effect.Effect<A, E, R | Scope.Scope>
    readonly deps: React.DependencyList
}

export interface UseQueryResult<A, E> {
    readonly state: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<A, E>>
    readonly triggerRefresh: Effect.Effect<void>
}


const interruptRunningQuery = (fiberRef: Ref.Ref<Option.Option<Fiber.Fiber<void>>>) => fiberRef.pipe(
    Effect.flatMap(Option.match({
        onSome: Fiber.interrupt,
        onNone: () => Effect.void,
    }))
)

const runQuery = <A, E, R>(
    effect: Effect.Effect<A, E, R | Scope.Scope>,
    stateRef: Ref.Ref<AsyncData.AsyncData<A, E>>,
) => effect.pipe(
    Effect.matchCauseEffect({
        onSuccess: v => Ref.set(stateRef, AsyncData.success(v)),
        onFailure: c => Ref.set(stateRef, AsyncData.failure(c)),
    })
)


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E> {
        const context = this.useContext()

        const fiberRef = this.useRef(Option.none<Fiber.Fiber<void>>())
        const stateRef = this.useRef(AsyncData.noData<A, E>())

        const triggerRefresh = React.useMemo(() => interruptRunningQuery(fiberRef).pipe(
            Effect.andThen(Ref.update(stateRef, prev =>
                AsyncData.isSuccess(prev) || AsyncData.isFailure(prev)
                    ? AsyncData.refreshing(prev)
                    : AsyncData.loading()
            )),
            Effect.andThen(runQuery(props.effect(), stateRef)),
            Effect.provide(context),
            Effect.scoped,
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [stateRef, context, fiberRef])

        this.useEffect(() => interruptRunningQuery(fiberRef).pipe(
            Effect.andThen(Ref.set(stateRef, AsyncData.loading())),
            Effect.andThen(runQuery(props.effect(), stateRef)),
            Effect.scoped,
            Effect.forkDaemon,

            Effect.flatMap(fiber => Ref.set(fiberRef, Option.some(fiber))),
        ), [...props.deps, stateRef, fiberRef])

        return React.useMemo(() => ({ state: stateRef, triggerRefresh }), [stateRef, triggerRefresh])
    }
}))
