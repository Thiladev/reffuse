import { Effect, type Layer, ManagedRuntime, Runtime } from "effect"
import * as React from "react"


export interface ReactManagedRuntime<R, ER> {
    readonly runtime: ManagedRuntime.ManagedRuntime<R, ER>
    readonly context: React.Context<Runtime.Runtime<R>>
}

export const make = <R, ER>(
    layer: Layer.Layer<R, ER>,
    memoMap?: Layer.MemoMap,
): ReactManagedRuntime<R, ER> => ({
    runtime: ManagedRuntime.make(layer, memoMap),
    context: React.createContext<Runtime.Runtime<R>>(null!),
})

export interface SyncProviderProps<R, ER> {
    readonly runtime: ReactManagedRuntime<R, ER>
    readonly children?: React.ReactNode
}

export const SyncProvider = <R, ER>(
    props: SyncProviderProps<R, ER>
): React.ReactNode => React.createElement(props.runtime.context, {
    value: React.useMemo(() => Effect.runSync(props.runtime.runtime.runtimeEffect), [props.runtime]),
    children: props.children,
})
SyncProvider.displayName = "ReactManagedRuntimeSyncProvider"
