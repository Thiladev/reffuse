import { Effect, ExecutionStrategy, Runtime, Scope } from "effect"
import * as React from "react"


export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
    readonly finalizerExecutionMode?: "sync" | "fork"
}


export const useMemo: {
    <A, E, R>(
        factory: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<A, never, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    return React.useMemo(() => Runtime.runSync(runtime)(factory()), deps)
})

export const useOnce: {
    <A, E, R>(factory: () => Effect.Effect<A, E, R>): Effect.Effect<A, never, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>
) {
    return yield* useMemo(factory, [])
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
