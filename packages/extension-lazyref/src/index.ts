import * as LazyRef from "@typed/lazy-ref"
import { Effect, pipe, Stream } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseNamespace, SetStateAction } from "reffuse"


export const LazyRefExtension = ReffuseExtension.make(() => ({
    useSubscribeLazyRefs<
        const Refs extends readonly LazyRef.LazyRef<any>[],
        R,
    >(
        this: ReffuseNamespace.ReffuseNamespace<R>,
        ...refs: Refs
    ): [...{ [K in keyof Refs]: Effect.Effect.Success<Refs[K]> }] {
        const [reactStateValue, setReactStateValue] = React.useState(this.useMemo(
            () => Effect.all(refs as readonly LazyRef.LazyRef<any>[]),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true },
        ) as [...{ [K in keyof Refs]: Effect.Effect.Success<Refs[K]> }])

        this.useFork(() => pipe(
            refs.map(ref => Stream.changesWith(ref.changes, (x, y) => x === y)),
            streams => Stream.zipLatestAll(...streams),
            Stream.runForEach(v =>
                Effect.sync(() => setReactStateValue(v as [...{ [K in keyof Refs]: Effect.Effect.Success<Refs[K]> }]))
            ),
        ), refs)

        return reactStateValue
    },

    useLazyRefState<A, E, R>(
        this: ReffuseNamespace.ReffuseNamespace<R>,
        ref: LazyRef.LazyRef<A, E, R>,
    ): [A, React.Dispatch<React.SetStateAction<A>>] {
        const [reactStateValue, setReactStateValue] = React.useState(this.useMemo(
            () => ref,
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true },
        ))

        this.useFork(() => Stream.runForEach(
            Stream.changesWith(ref.changes, (x, y) => x === y),
            v => Effect.sync(() => setReactStateValue(v)),
        ), [ref])

        const setValue = this.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
            LazyRef.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            ),
        [ref])

        return [reactStateValue, setValue]
    },
}))
