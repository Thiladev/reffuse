import { Effect, type ExecutionStrategy, Runtime, Scope } from "effect"
import * as React from "react"


export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
    readonly finalizerExecutionMode?: "sync" | "fork"
}


export const useScope: Effect.Effect<void> = Effect.gen(function*() {

})

export const useEffect = <E, R>(
    effect: () => Effect.Effect<void, E, R | Scope.Scope>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
): Effect.Effect<void, never, R> => Effect.gen(function*() {
    const runtime = yield* Effect.runtime<R>()

    React.useEffect(() => {
        const { scope, exit } = Effect.Do.pipe(
            Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy)),
            Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
            Runtime.runSync(runtime),
        )

        return () => { Runtime.runSync(runtime)(Scope.close(scope, exit)) }
    }, deps)
})

export const useLayoutEffect = <E, R>(
    effect: () => Effect.Effect<void, E, R | Scope.Scope>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
): Effect.Effect<void, never, R> => Effect.gen(function*() {
    const runtime = yield* Effect.runtime<R>()

    React.useLayoutEffect(() => {
        const { scope, exit } = Effect.Do.pipe(
            Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy)),
            Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
            Runtime.runSync(runtime),
        )

        return () => { Runtime.runSync(runtime)(Scope.close(scope, exit)) }
    }, deps)
})
