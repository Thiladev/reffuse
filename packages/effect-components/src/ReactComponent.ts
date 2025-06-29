import { Context, Effect, ExecutionStrategy, Exit, Ref, Runtime, Scope, Tracer } from "effect"
import * as React from "react"
import * as ReactHook from "./ReactHook.js"


export interface ReactComponent<P, E, R> {
    (props: P): Effect.Effect<React.ReactNode, E, R>
}


export const use = <P, E, R>(
    self: ReactComponent<P, E, R>,
    fn: (Component: React.FC<P>) => React.ReactNode,
    options?: ReactHook.ScopeOptions,
): Effect.Effect<React.ReactNode, never, Exclude<R, Scope.Scope>> => Effect.map(
    Effect.runtime(),
    runtime => fn(props => FC(self as ReactComponent<P, E, Exclude<R, Scope.Scope>>, runtime, props, options)),
)

export const useFC = <P, E, R>(
    self: ReactComponent<P, E, R>,
    options?: ReactHook.ScopeOptions,
): Effect.Effect<React.FC<P>, never, Exclude<R, Scope.Scope>> => Effect.map(
    Effect.runtime(),
    runtime => props => FC(self as ReactComponent<P, E, Exclude<R, Scope.Scope>>, runtime, props, options),
)


const FC = <P, E, R>(
    self: ReactComponent<P, E, R>,
    runtime: Runtime.Runtime<R>,
    props: P,
    options?: ReactHook.ScopeOptions,
): React.ReactNode => {
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

    return React.useMemo(() => Runtime.runSync(runtime)(
        Effect.provideService(self(props), Scope.Scope, scope)
    ), [
        props,
        ...Array.from(Context.omit(Tracer.ParentSpan)(runtime.context).unsafeMap.values()),
    ])
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
