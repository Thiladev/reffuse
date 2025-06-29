import { Context, Effect, Runtime, Tracer } from "effect"
import * as React from "react"
import * as ReactHook from "./ReactHook.js"


export interface ReactComponent<P, E, R> {
    (props: P): Effect.Effect<React.ReactNode, E, R>
}

export const nonReactiveTags = [Tracer.ParentSpan] as const


export const useFC: {
    <P, E, R>(
        self: ReactComponent<P, E, R>,
        options?: ReactHook.ScopeOptions,
    ): Effect.Effect<React.FC<P>, never, R>
} = Effect.fnUntraced(function* useFC<P, E, R>(
    self: ReactComponent<P, E, R>
) {
    const runtime = yield* Effect.runtime<R>()

    return React.useMemo(() => {
        return (props: P) => Runtime.runSync(runtime)(self(props))
    }, Array.from(
        Context.omit(...nonReactiveTags)(runtime.context).unsafeMap.values()
    ))
})

export const use: {
    <P, E, R>(
        self: ReactComponent<P, E, R>,
        fn: (Component: React.FC<P>) => React.ReactNode,
    ): Effect.Effect<React.ReactNode, never, R>
} = Effect.fnUntraced(function* use(self, fn) {
    return fn(yield* useFC(self))
})


// export const useFC: {
//     <P, E, R>(
//         self: ReactComponent<P, E, R>,
//         options?: ReactHook.ScopeOptions,
//     ): Effect.Effect<React.FC<P>, never, Exclude<R, Scope.Scope>>
// } = Effect.fnUntraced(function* useFC<P, E, R>(
//     self: ReactComponent<P, E, R>,
//     options?: ReactHook.ScopeOptions,
// ) {
//     const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

//     return React.useCallback((props: P) => {
//         const [isInitialRun, initialScope] = React.useMemo(() => Runtime.runSync(runtime)(
//             Effect.all([Ref.make(true), makeScope(options)])
//         ), [])
//         const [scope, setScope] = React.useState(initialScope)

//         React.useEffect(() => Runtime.runSync(runtime)(
//             Effect.if(isInitialRun, {
//                 onTrue: () => Effect.as(
//                     Ref.set(isInitialRun, false),
//                     () => closeScope(scope, runtime, options),
//                 ),

//                 onFalse: () => makeScope(options).pipe(
//                     Effect.tap(scope => Effect.sync(() => setScope(scope))),
//                     Effect.map(scope => () => closeScope(scope, runtime, options)),
//                 ),
//             })
//         ), [])

//         return Runtime.runSync(runtime)(
//             Effect.provideService(self(props), Scope.Scope, scope)
//         )
//     }, Array.from(
//         Context.omit(...nonReactiveTags)(runtime.context).unsafeMap.values()
//     ))
// })

// const makeScope = (options?: ReactHook.ScopeOptions) => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
// const closeScope = (
//     scope: Scope.CloseableScope,
//     runtime: Runtime.Runtime<never>,
//     options?: ReactHook.ScopeOptions,
// ) => {
//     switch (options?.finalizerExecutionMode ?? "sync") {
//         case "sync":
//             Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
//             break
//         case "fork":
//             Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
//             break
//     }
// }
