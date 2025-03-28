import { Array, Context, Effect, ExecutionStrategy, Exit, Layer, Ref, Runtime, Scope } from "effect"
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
    readonly layer: Layer.Layer<R, unknown, Scope.Scope>
    readonly children?: React.ReactNode
}>

const makeProvider = <R>(Context: React.Context<Context.Context<R>>): ReactProvider<R> => {
    return function ReffuseContextReactProvider(props) {
        const runtime = ReffuseRuntime.useRuntime()
        const runSync = React.useMemo(() => Runtime.runSync(runtime), [runtime])

        const makeContext = React.useCallback((scope: Scope.CloseableScope) => Effect.context<R>().pipe(
            Effect.provide(props.layer),
            Effect.provideService(Scope.Scope, scope),
        ), [props.layer])

        const [isInitialRun, initialScope, initialValue] = React.useMemo(() => Effect.Do.pipe(
            Effect.bind("isInitialRun", () => Ref.make(true)),
            Effect.bind("scope", () => Scope.make()),
            Effect.bind("context", ({ scope }) => makeContext(scope)),
            Effect.map(({ isInitialRun, scope, context }) => [isInitialRun, scope, context] as const),
            runSync,
        ), [])

        const [value, setValue] = React.useState(initialValue)

        React.useEffect(() => isInitialRun.pipe(
            Effect.if({
                onTrue: () => Ref.set(isInitialRun, false).pipe(
                    Effect.map(() =>
                        () => runSync(Scope.close(initialScope, Exit.void))
                    )
                ),

                onFalse: () => Effect.Do.pipe(
                    Effect.bind("scope", () => Scope.make()),
                    Effect.bind("context", ({ scope }) => makeContext(scope)),
                    Effect.tap(({ context }) =>
                        Effect.sync(() => setValue(context))
                    ),
                    Effect.map(({ scope }) =>
                        () => runSync(Scope.close(scope, Exit.void))
                    ),
                ),
            }),

            runSync,
        ), [makeContext, runSync])

        return React.createElement(Context, { ...props, value })
    }
}

export type AsyncReactProvider<R> = React.FC<{
    readonly layer: Layer.Layer<R, unknown, Scope.Scope>
    readonly options?: {
        readonly scope?: Scope.Scope
        readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
    }
    readonly fallback?: React.ReactNode
    readonly children?: React.ReactNode
}>

const makeAsyncProvider = <R>(Context: React.Context<Context.Context<R>>): AsyncReactProvider<R> => {
    function ReffuseContextAsyncReactProviderInner({ promise, children }: {
        readonly promise: Promise<Context.Context<R>>
        readonly children?: React.ReactNode
    }) {
        return React.createElement(Context, {
            value: React.use(promise),
            children,
        })
    }

    return function ReffuseContextAsyncReactProvider(props) {
        const runtime = ReffuseRuntime.useRuntime()
        const runSync = React.useMemo(() => Runtime.runSync(runtime), [runtime])
        const runFork = React.useMemo(() => Runtime.runFork(runtime), [runtime])

        const [promise, setPromise] = React.useState(Promise.withResolvers<Context.Context<R>>().promise)

        React.useEffect(() => {
            const { promise, resolve, reject } = Promise.withResolvers<Context.Context<R>>()
            setPromise(promise)

            const scope = runSync(props.options?.scope
                ? Scope.fork(props.options.scope, props.options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
                : Scope.make(props.options?.finalizerExecutionStrategy)
            )

            Effect.context<R>().pipe(
                Effect.match({
                    onSuccess: resolve,
                    onFailure: reject,
                }),

                Effect.provide(props.layer),
                Effect.provideService(Scope.Scope, scope),
                effect => runFork(effect, { ...props.options, scope }),
            )

            return () => { runFork(Scope.close(scope, Exit.void)) }
        }, [props.layer, runSync, runFork])

        return React.createElement(React.Suspense, {
            children: React.createElement(ReffuseContextAsyncReactProviderInner, { ...props, promise }),
            fallback: props.fallback,
        })
    }
}


export const make = <R = never>() => new ReffuseContext<R>()

export const useMergeAll = <T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Context.Context<T[number]> => {
    const values = contexts.map(v => React.use(v.Context))
    return React.useMemo(() => Context.mergeAll(...values), values)
}

export const useMergeAllLayers = <T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext<T[K]> }]
): Layer.Layer<T[number]> => {
    const values = contexts.map(v => React.use(v.Context))

    return React.useMemo(() => Array.isNonEmptyArray(values)
        ? Layer.mergeAll(
            ...Array.map(values, context => Layer.effectContext(Effect.succeed(context)))
        )
        : Layer.empty as Layer.Layer<T[number]>,
    values)
}
