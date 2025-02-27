import * as AsyncData from "@typed/async-data"
import { Effect, Scope } from "effect"
import * as React from "react"
import { useState } from "react"
import { ReffuseExtension, type ReffuseHelpers } from "reffuse"


export interface UseQueryProps<A, E, R> {
    effect(): Effect.Effect<A, E, R | Scope.Scope>
    readonly deps?: React.DependencyList
}

export interface UseQueryResult<A, E> {
    readonly state: AsyncData.AsyncData<A, E>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        props: UseQueryProps<A, E, R>,
    ): UseQueryResult<A, E> {
        const [state, setState] = useState(AsyncData.noData<A, E>())

        this.useFork(() => Effect.sync(() => setState(AsyncData.loading())).pipe(
            Effect.andThen(props.effect()),
            Effect.matchCause({
                onSuccess: v => setState(AsyncData.success(v)),
                onFailure: c => setState(AsyncData.failure(c)),
            }),
        ), props.deps)

        return { state }
    }
}))
