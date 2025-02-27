import * as LazyRef from "@typed/lazy-ref"
import { Effect, Stream } from "effect"
import * as React from "react"
import { ReffuseExtension, type ReffuseHelpers, SetStateAction } from "reffuse"


export const LazyRefExtension = ReffuseExtension.make(() => ({
    useLazyRefState<A, E, R>(
        this: ReffuseHelpers.ReffuseHelpers<R>,
        ref: LazyRef.LazyRef<A, E, R>,
    ): [A, React.Dispatch<React.SetStateAction<A>>] {
        const initialState = this.useMemo(() => ref, [], { doNotReExecuteOnRuntimeOrContextChange: true })
        const [reactStateValue, setReactStateValue] = React.useState(initialState)

        this.useFork(() => Stream.runForEach(ref.changes, v => Effect.sync(() =>
            setReactStateValue(v)
        )), [ref])

        const setValue = this.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
            LazyRef.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            ),
        [ref])

        return [reactStateValue, setValue]
    },
}))
