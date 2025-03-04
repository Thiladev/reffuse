import { Array, Context, Effect, Layer, Runtime } from "effect"
import * as React from "react"
import * as ReffuseRuntime from "./ReffuseRuntime.js"


export class ReffuseContext<R> {
    readonly Context = React.createContext<Context.Context<R>>(null!)
    readonly Provider = makeProvider(this.Context)
    readonly AsyncProvider = makeAsyncProvider(this.Context)


    useContext(): Context.Context<R> {
        return React.useContext(this.Context)
    }

    useLayer(): Layer.Layer<R> {
        const context = this.useContext()
        return React.useMemo(() => Layer.effectContext(Effect.succeed(context)), [context])
    }
}

export type R<T> = T extends ReffuseContext<infer R> ? R : never


export type ReactProvider<R> = React.FC<{
    readonly layer: Layer.Layer<R, unknown>
    readonly children?: React.ReactNode
}>

function makeProvider<R>(Context: React.Context<Context.Context<R>>): ReactProvider<R> {
    return function ReffuseContextReactProvider(props) {
        const runtime = ReffuseRuntime.useRuntime()

        const value = React.useMemo(() => Effect.context<R>().pipe(
            Effect.provide(props.layer),
            Runtime.runSync(runtime),
        ), [props.layer, runtime])

        return (
            <Context
                {...props}
                value={value}
            />
        )
    }
}

export type AsyncReactProvider<R> = React.FC<{
    readonly layer: Layer.Layer<R, unknown>
    readonly fallback?: React.ReactNode
    readonly children?: React.ReactNode
}>

function makeAsyncProvider<R>(Context: React.Context<Context.Context<R>>): AsyncReactProvider<R> {
    function Inner({ promise, children }: {
        readonly promise: Promise<Context.Context<R>>
        readonly children?: React.ReactNode
    }) {
        const value = React.use(promise)

        return (
            <Context
                value={value}
                children={children}
            />
        )
    }

    return function ReffuseContextAsyncReactProvider(props) {
        const runtime = ReffuseRuntime.useRuntime()

        const promise = React.useMemo(() => Effect.context<R>().pipe(
            Effect.provide(props.layer),
            Runtime.runPromise(runtime),
        ), [props.layer, runtime])

        return (
            <React.Suspense fallback={props.fallback}>
                <Inner
                    {...props}
                    promise={promise}
                />
            </React.Suspense>
        )
    }
}


export function make<R = never>() {
    return new ReffuseContext<R>()
}

export function useMergeAll<T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Context.Context<T[number]> {
    const values = contexts.map(v => React.use(v.Context))
    return React.useMemo(() => Context.mergeAll(...values), values)
}

export function useMergeAllLayers<T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Layer.Layer<T[number]> {
    const values = contexts.map(v => React.use(v.Context))

    return React.useMemo(() => Array.isNonEmptyArray(values)
        ? Layer.mergeAll(
            ...Array.map(values, context => Layer.effectContext(Effect.succeed(context)))
        )
        : Layer.empty as Layer.Layer<T[number]>,
    values)
}
