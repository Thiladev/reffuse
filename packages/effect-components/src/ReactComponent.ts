import { Effect, ExecutionStrategy, Exit, Ref, Runtime, Scope } from "effect"
import * as React from "react"
import * as ReactHook from "./ReactHook.js"


export interface ReactComponent<P, E, R> {
    (props: P): Effect.Effect<React.ReactNode, E, R | Scope.Scope>
}


export const use = <P, E, R>(
    self: ReactComponent<P, E, R>,
    fn: (Component: React.FC<P>) => React.ReactNode,
    options?: ReactHook.ScopeOptions,
): Effect.Effect<React.ReactNode, never, Exclude<R, Scope.Scope>> => Effect.map(
    Effect.runtime(),
    runtime => fn(props =>
        Runtime.runSync(runtime)(Effect.provideService(self(props), Scope.Scope, useScope(runtime, options)))
    ),
)

export const useFC = <P, E, R>(
    self: ReactComponent<P, E, R>,
    options?: ReactHook.ScopeOptions,
): Effect.Effect<React.FC<P>, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => props => Runtime.runSync(runtime)(Effect.provideService(self(props), Scope.Scope, useScope(runtime, options))),
)

export const createElement = <P, E, R>(
    self: ReactComponent<P, E, R>,
    props?: React.Attributes & P | null,
    ...children: React.ReactNode[]
): Effect.Effect<React.ReactNode, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => React.createElement(
        props => Runtime.runSync(runtime)(self(props)),
        props,
        ...children,
    ),
)


const useScope = (
    runtime: Runtime.Runtime<never>,
    options?: ReactHook.ScopeOptions,
): Scope.Scope => {
    const [isInitialRun, initialScope] = React.useMemo(() => Runtime.runSync(runtime)(
        Effect.all([Ref.make(true), makeScope(options)])
    ), [])
    const [scope, setScope] = React.useState(initialScope)

    React.useEffect(() => Runtime.runSync(runtime)(
        Effect.if(isInitialRun, {
            onTrue: () => Effect.as(
                Ref.set(isInitialRun, false),
                () => closeScope(scope, runtime, options),
            ),

            onFalse: () => makeScope(options).pipe(
                Effect.tap(scope => Effect.sync(() => setScope(scope))),
                Effect.map(scope => () => closeScope(scope, runtime, options)),
            ),
        })
    ), [])

    return scope
}

const makeScope = (options?: ReactHook.ScopeOptions) => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
const closeScope = (
    scope: Scope.CloseableScope,
    runtime: Runtime.Runtime<never>,
    options?: ReactHook.ScopeOptions,
) => {
    switch (options?.finalizerExecutionMode ?? "sync") {
        case "sync":
            Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
            break
        case "fork":
            Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
            break
    }
}
