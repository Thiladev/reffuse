import type { Context, Effect, ExecutionStrategy, Fiber, Pipeable, Runtime, Scope, SubscriptionRef } from "effect"
import type * as React from "react"


export interface ReffuseHelper<R> extends Pipeable.Pipeable {
    useContext(): Context.Context<R>

    useRunSync(): <A, E>(effect: Effect.Effect<A, E, R>) => A
    useRunPromise(): <A, E>(effect: Effect.Effect<A, E, R>, options?: {
        readonly signal?: AbortSignal
    }) => Promise<A>
    useRunFork(): <A, E>(effect: Effect.Effect<A, E, R>, options?: Runtime.RunForkOptions) => Fiber.RuntimeFiber<A, E>
    useRunCallback(): <A, E>(effect: Effect.Effect<A, E, R>, options?: Runtime.RunCallbackOptions<A, E>) => Runtime.Cancel<A, E>

    useMemo<A, E>(
        effect: Effect.Effect<A, E, R>,
        deps?: React.DependencyList,
        options?: RenderOptions,
    ): A

    useMemoScoped<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): A

    useLayoutEffect<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): void

    useFork<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & RenderOptions & ScopeOptions,
    ): void

    usePromise<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: { readonly signal?: AbortSignal } & Runtime.RunForkOptions & RenderOptions & ScopeOptions,
    ): Promise<A>

    useRef<A>(value: A): SubscriptionRef.SubscriptionRef<A>
    useRefState<A>(ref: SubscriptionRef.SubscriptionRef<A>): readonly [A, React.Dispatch<React.SetStateAction<A>>]
}


export interface RenderOptions {
    /** Prevents re-executing the effect when the Effect runtime or context changes. Defaults to `false`. */
    readonly doNotReExecuteOnRuntimeOrContextChange?: boolean
}

export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}
