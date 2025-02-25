import * as LazyRef from "@typed/lazy-ref"
import { Effect, Stream } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers, SetStateAction } from "reffuse"


export const LazyRefExtension = ReffuseExtension.make(() => ({
    useLazyRefState<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        ref: LazyRef.LazyRef<A, E, R>,
    ): [A, React.Dispatch<React.SetStateAction<A>>] {
        const runSync = this.useRunSync()

        const initialState = React.useMemo(() => runSync(ref), [])
        const [reactStateValue, setReactStateValue] = React.useState(initialState)

        this.useFork(Stream.runForEach(ref.changes, v => Effect.sync(() =>
            setReactStateValue(v)
        )), [ref])

        const setValue = React.useCallback((setStateAction: React.SetStateAction<A>) =>
            runSync(LazyRef.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            )),
        [ref])

        return [reactStateValue, setValue]
    },
}))
