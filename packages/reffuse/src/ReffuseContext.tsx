import { Array, Context, Effect, Layer, Runtime } from "effect"
import * as React from "react"
import * as ReffuseRuntime from "./ReffuseRuntime.js"


export class ReffuseContext<R> {

    readonly Context = React.createContext<Context.Context<R>>(null!)
    readonly Provider: ReffuseContextReactProvider<R>

    constructor() {
        // TODO: scope the layer creation
        this.Provider = props => {
            const runtime = ReffuseRuntime.useRuntime()

            const value = React.useMemo(() => Effect.context<R>().pipe(
                Effect.provide(props.layer),
                Runtime.runSync(runtime),
            ), [props.layer, runtime])

            return (
                <this.Context
                    {...props}
                    value={value}
                />
            )
        }
        this.Provider.displayName = "ReffuseContextReactProvider"
    }


    useContext(): Context.Context<R> {
        return React.useContext(this.Context)
    }

    useLayer(): Layer.Layer<R> {
        const context = this.useContext()
        return React.useMemo(() => Layer.effectContext(Effect.succeed(context)), [context])
    }

}

export type ReffuseContextReactProvider<R> = React.FC<{
    readonly layer: Layer.Layer<R, unknown>
    readonly children?: React.ReactNode
}>

export type R<T> = T extends ReffuseContext<infer R> ? R : never


export function make<R = never>() {
    return new ReffuseContext<R>()
}

export function useMergeAll<T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Context.Context<T[number]> {
    const values = contexts.map(v => React.use(v.Context))
    return React.useMemo(() => Context.mergeAll(...values), values)
}

export function useMergeAllLayers<T extends Array.NonEmptyArray<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Layer.Layer<T[number]> {
    const values = Array.map(
        contexts as Array.NonEmptyArray<ReffuseContext<T[number]>>,
        v => React.use(v.Context),
    )

    return React.useMemo(() => Layer.mergeAll(
        ...Array.map(values, context => Layer.effectContext(Effect.succeed(context)))
    ), values)
}
