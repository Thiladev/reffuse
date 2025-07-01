import { type Context, Effect, ExecutionStrategy, Exit, type Layer, pipe, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { SetStateAction } from "./types/index.js"


export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
    readonly finalizerExecutionMode?: "sync" | "fork"
}


export const useMemo: {
    <A, E, R>(
        factory: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime()
    return yield* React.useMemo(() => Runtime.runSync(runtime)(Effect.cached(factory())), deps)
})

export const useOnce: {
    <A, E, R>(factory: () => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>
) {
    return yield* useMemo(factory, [])
})

export const useMemoLayer: {
    <ROut, E, RIn>(
        layer: Layer.Layer<ROut, E, RIn>
    ): Effect.Effect<Context.Context<ROut>, E, RIn>
} = Effect.fnUntraced(function* <ROut, E, RIn>(
    layer: Layer.Layer<ROut, E, RIn>
) {
    return yield* useMemo(() => Effect.provide(Effect.context<ROut>(), layer), [layer])
})


export const useCallbackSync: {
    <Args extends unknown[], A, E, R>(
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => A, never, R>
} = Effect.fnUntraced(function* <Args extends unknown[], A, E, R>(
    callback: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    return React.useCallback((...args: Args) => Runtime.runSync(runtime)(callback(...args)), deps)
})

export const useCallbackPromise: {
    <Args extends unknown[], A, E, R>(
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => Promise<A>, never, R>
} = Effect.fnUntraced(function* <Args extends unknown[], A, E, R>(
    callback: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    return React.useCallback((...args: Args) => Runtime.runPromise(runtime)(callback(...args)), deps)
})


export const useEffect: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => {
        const { scope, exit } = Effect.Do.pipe(
            Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)),
            Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
            Runtime.runSync(runtime),
        )

        return () => {
            switch (options?.finalizerExecutionMode ?? "sync") {
                case "sync":
                    Runtime.runSync(runtime)(Scope.close(scope, exit))
                    break
                case "fork":
                    Runtime.runFork(runtime)(Scope.close(scope, exit))
                    break
            }
        }
    }, deps)
})

export const useLayoutEffect: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useLayoutEffect(() => {
        const { scope, exit } = Effect.Do.pipe(
            Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)),
            Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
            Runtime.runSync(runtime),
        )

        return () => {
            switch (options?.finalizerExecutionMode ?? "sync") {
                case "sync":
                    Runtime.runSync(runtime)(Scope.close(scope, exit))
                    break
                case "fork":
                    Runtime.runFork(runtime)(Scope.close(scope, exit))
                    break
            }
        }
    }, deps)
})

export const useFork: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: Runtime.RunForkOptions & ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => {
        const scope = Runtime.runSync(runtime)(options?.scope
            ? Scope.fork(options.scope, options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
            : Scope.make(options?.finalizerExecutionStrategy)
        )
        Runtime.runFork(runtime)(Effect.provideService(effect(), Scope.Scope, scope), { ...options, scope })

        return () => {
            switch (options?.finalizerExecutionMode ?? "fork") {
                case "sync":
                    Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
                    break
                case "fork":
                    Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
                    break
            }
        }
    }, deps)
})


export const useSubscribeRefs: {
    <const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[]>(
        ...refs: Refs
    ): Effect.Effect<{ [K in keyof Refs]: Effect.Effect.Success<Refs[K]> }>
} = Effect.fnUntraced(function* <const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[]>(
    ...refs: Refs
) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() =>
        Effect.all(refs as readonly SubscriptionRef.SubscriptionRef<any>[])
    ))

    yield* useFork(() => pipe(
        refs.map(ref => Stream.changesWith(ref.changes, (x, y) => x === y)),
        streams => Stream.zipLatestAll(...streams),
        Stream.runForEach(v =>
            Effect.sync(() => setReactStateValue(v))
        ),
    ), refs)

    return reactStateValue as any
})

export const useRefState: {
    <A>(
        ref: SubscriptionRef.SubscriptionRef<A>
    ): Effect.Effect<readonly [A, React.Dispatch<React.SetStateAction<A>>]>
} = Effect.fnUntraced(function* <A>(ref: SubscriptionRef.SubscriptionRef<A>) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() => ref))

    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(ref.changes, (x, y) => x === y),
        v => Effect.sync(() => setReactStateValue(v)),
    ), [ref])

    const setValue = yield* useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        Ref.update(ref, prevState =>
            SetStateAction.value(setStateAction, prevState)
        ),
    [ref])

    return [reactStateValue, setValue]
})
