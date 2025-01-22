import * as LazyRef from "@typed/lazy-ref"
import { Context, Effect, ExecutionStrategy, Exit, Fiber, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
import React from "react"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseRuntime from "./ReffuseRuntime.js"
import * as SetStateAction from "./SetStateAction.js"


export class Reffuse<R> {

    constructor(
        readonly contexts: readonly ReffuseContext.ReffuseContext<R>[]
    ) {}


    useContext(): Context.Context<R> {
        return ReffuseContext.useMergeAll(...this.contexts)
    }


    useRunSync() {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(<A, E>(
            effect: Effect.Effect<A, E, R>
        ): A => effect.pipe(
            Effect.provide(context),
            Runtime.runSync(runtime),
        ), [runtime, context])
    }

    useRunPromise() {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(<A, E>(
            effect: Effect.Effect<A, E, R>,
            options?: { readonly signal?: AbortSignal },
        ): Promise<A> => effect.pipe(
            Effect.provide(context),
            effect => Runtime.runPromise(runtime)(effect, options),
        ), [runtime, context])
    }

    useRunFork() {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(<A, E>(
            effect: Effect.Effect<A, E, R>,
            options?: Runtime.RunForkOptions,
        ): Fiber.RuntimeFiber<A, E> => effect.pipe(
            Effect.provide(context),
            effect => Runtime.runFork(runtime)(effect, options),
        ), [runtime, context])
    }

    useRunCallback() {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(<A, E>(
            effect: Effect.Effect<A, E, R>,
            options?: Runtime.RunCallbackOptions<A, E>,
        ): Runtime.Cancel<A, E> => effect.pipe(
            Effect.provide(context),
            effect => Runtime.runCallback(runtime)(effect, options),
        ), [runtime, context])
    }


    /**
     * Reffuse equivalent to `React.useMemo`.
     *
     * `useMemo` will only recompute the memoized value by running the given synchronous effect when one of the deps has changed. \
     * Trying to run an asynchronous effect will throw.
     *
     * Changes to the Reffuse runtime or context will recompute the value in addition to the deps.
     * You can disable this behavior by setting `doNotReExecuteOnRuntimeOrContextChange` to `true` in `options`.
     */
    useMemo<A, E>(
        effect: Effect.Effect<A, E, R>,
        deps?: React.DependencyList,
        options?: RenderOptions,
    ): A {
        const runSync = this.useRunSync()

        return React.useMemo(() => runSync(effect), [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...(deps ?? []),
        ])
    }

    useMemoScoped<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): A {
        const runSync = this.useRunSync()

        // Calculate an initial version of the value so that it can be accessed during the first render
        const [initialScope, initialValue] = React.useMemo(() => Scope.make(options?.finalizerExecutionStrategy).pipe(
            Effect.flatMap(scope => effect.pipe(
                Effect.provideService(Scope.Scope, scope),
                Effect.map(value => [scope, value] as const),
            )),

            runSync,
        ), [])

        // Keep track of the state of the initial scope
        const initialScopeClosed = React.useRef(false)

        const [value, setValue] = React.useState(initialValue)

        React.useEffect(() => {
            const closeInitialScope = Scope.close(initialScope, Exit.void).pipe(
                Effect.andThen(Effect.sync(() => { initialScopeClosed.current = true })),
                Effect.when(() => !initialScopeClosed.current),
            )

            const [scope, value] = closeInitialScope.pipe(
                Effect.andThen(Scope.make(options?.finalizerExecutionStrategy).pipe(
                    Effect.flatMap(scope => effect.pipe(
                        Effect.provideService(Scope.Scope, scope),
                        Effect.map(value => [scope, value] as const),
                    ))
                )),

                runSync,
            )

            setValue(value)
            return () => { runSync(Scope.close(scope, Exit.void)) }
        }, [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...(deps ?? []),
        ])

        return value
    }

    /**
     * Reffuse equivalent to `React.useEffect`.
     *
     * Executes a synchronous effect wrapped into a Scope when one of the deps has changed. Trying to run an asynchronous effect will throw.
     *
     * The Scope is closed on every cleanup, i.e. when one of the deps has changed and the effect needs to be re-executed. \
     * Add finalizers to the Scope to handle cleanup logic.
     *
     * Changes to the Reffuse runtime or context will re-execute the effect in addition to the deps.
     * You can disable this behavior by setting `doNotReExecuteOnRuntimeOrContextChange` to `true` in `options`.
     *
     * ### Example
     * ```
     * useEffect(Effect.addFinalizer(() => Console.log("Component unmounted")).pipe(
     *     Effect.flatMap(() => Console.log("Component mounted"))
     * ))
     * ```
     *
     * Plain React equivalent:
     * ```
     * React.useEffect(() => {
     *     console.log("Component mounted")
     *     return () => { console.log("Component unmounted") }
     * })
     * ```
     */
    useEffect<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()

        return React.useEffect(() => {
            const scope = Scope.make(options?.finalizerExecutionStrategy).pipe(
                Effect.tap(scope => Effect.provideService(effect, Scope.Scope, scope)),
                runSync,
            )

            return () => { runSync(Scope.close(scope, Exit.void)) }
        }, [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...(deps ?? []),
        ])
    }

    /**
     * Reffuse equivalent to `React.useLayoutEffect`.
     *
     * Executes a synchronous effect wrapped into a Scope when one of the deps has changed. Fires synchronously after all DOM mutations. \
     * Trying to run an asynchronous effect will throw.
     *
     * The Scope is closed on every cleanup, i.e. when one of the deps has changed and the effect needs to be re-executed. \
     * Add finalizers to the Scope to handle cleanup logic.
     *
     * Changes to the Reffuse runtime or context will re-execute the effect in addition to the deps.
     * You can disable this behavior by setting `doNotReExecuteOnRuntimeOrContextChange` to `true` in `options`.
     *
     * ### Example
     * ```
     * useLayoutEffect(Effect.addFinalizer(() => Console.log("Component unmounted")).pipe(
     *     Effect.flatMap(() => Console.log("Component mounted"))
     * ))
     * ```
     *
     * Plain React equivalent:
     * ```
     * React.useLayoutEffect(() => {
     *     console.log("Component mounted")
     *     return () => { console.log("Component unmounted") }
     * })
     * ```
     */
    useLayoutEffect<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()

        return React.useLayoutEffect(() => {
            const scope = Scope.make(options?.finalizerExecutionStrategy).pipe(
                Effect.tap(scope => Effect.provideService(effect, Scope.Scope, scope)),
                runSync,
            )

            return () => { runSync(Scope.close(scope, Exit.void)) }
        }, [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...(deps ?? []),
        ])
    }

    /**
     * An asynchronous and non-blocking alternative to `React.useEffect`.
     *
     * Forks an effect wrapped into a Scope in the background when one of the deps has changed.
     *
     * The Scope is closed on every cleanup, i.e. when one of the deps has changed and the effect needs to be re-executed. \
     * Add finalizers to the Scope to handle cleanup logic.
     *
     * Changes to the Reffuse runtime or context will re-execute the effect in addition to the deps.
     * You can disable this behavior by setting `doNotReExecuteOnRuntimeOrContextChange` to `true` in `options`.
     *
     * ### Example
     * ```
     * const timeRef = useRefFromEffect(DateTime.now)
     *
     * useFork(Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
     *     Effect.map(() => Stream.repeatEffectWithSchedule(
     *         DateTime.now,
     *         Schedule.intersect(Schedule.forever, Schedule.spaced("1 second")),
     *     )),
     *
     *     Effect.flatMap(Stream.runForEach(time => Ref.set(timeRef, time)),
     * )), [timeRef])
     *
     * const [time] = useRefState(timeRef)
     * ```
     */
    useFork<A, E>(
        effect: Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()
        const runFork = this.useRunFork()

        return React.useEffect(() => {
            const scope = runSync(Scope.make(options?.finalizerExecutionStrategy))
            const fiber = runFork(Effect.provideService(effect, Scope.Scope, scope), options)

            return () => {
                Fiber.interrupt(fiber).pipe(
                    Effect.andThen(Scope.close(scope, Exit.void)),
                    runFork,
                )
            }
        }, [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync, runFork],
            ...(deps ?? []),
        ])
    }

    // useSuspense<A, E>(
    //     effect: Effect.Effect<A, E, R>,
    //     deps?: React.DependencyList,
    //     options?: { readonly signal?: AbortSignal } & RenderOptions,
    // ): A {
    //     const runPromise = this.useRunPromise()

    //     const promise = React.useMemo(() => runPromise(effect, options), [
    //         ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runPromise],
    //         ...(deps ?? []),
    //     ])
    //     return React.use(promise)
    // }

    // useSuspenseScoped<A, E>(
    //     effect: Effect.Effect<A, E, R | Scope.Scope>,
    //     deps?: React.DependencyList,
    //     options?: { readonly signal?: AbortSignal } & RenderOptions & ScopeOptions,
    // ): A {
    //     const runSync = this.useRunSync()
    //     const runPromise = this.useRunPromise()

    //     const initialPromise = React.useMemo(() => runPromise(Effect.scoped(effect)), [])
    //     const [promise, setPromise] = React.useState(initialPromise)

    //     React.useEffect(() => {
    //         const scope = runSync(Scope.make())
    //         setPromise(runPromise(Effect.provideService(effect, Scope.Scope, scope), options))

    //         return () => { runPromise(Scope.close(scope, Exit.void)) }
    //     }, [
    //         ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync, runPromise],
    //         ...(deps ?? []),
    //     ])

    //     return React.use(promise)
    // }


    useRef<A>(value: A): SubscriptionRef.SubscriptionRef<A> {
        return this.useMemo(
            SubscriptionRef.make(value),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: false }, // Do not recreate the ref when the context changes
        )
    }

    useRefFromEffect<A, E>(effect: Effect.Effect<A, E, R>): SubscriptionRef.SubscriptionRef<A> {
        return this.useMemo(
            effect.pipe(Effect.flatMap(SubscriptionRef.make)),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: false }, // Do not recreate the ref when the context changes
        )
    }

    /**
     * Binds the state of a `SubscriptionRef` to the state of the React component.
     *
     * Returns a [value, setter] tuple just like `React.useState` and triggers a re-render everytime the value held by the ref changes.
     *
     * Note that the rules of React's immutable state still apply: updating a ref with the same value will not trigger a re-render.
     */
    useRefState<A>(ref: SubscriptionRef.SubscriptionRef<A>): [A, React.Dispatch<React.SetStateAction<A>>] {
        const runSync = this.useRunSync()

        const initialState = React.useMemo(() => runSync(ref), [])
        const [reactStateValue, setReactStateValue] = React.useState(initialState)

        this.useFork(Stream.runForEach(ref.changes, v => Effect.sync(() =>
            setReactStateValue(v)
        )), [ref])

        const setValue = React.useCallback((setStateAction: React.SetStateAction<A>) =>
            runSync(Ref.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            )),
        [ref])

        return [reactStateValue, setValue]
    }

    /**
     * Binds the state of a `LazyRef` from the `@typed/lazy-ref` package to the state of the React component.
     *
     * Returns a [value, setter] tuple just like `React.useState` and triggers a re-render everytime the value held by the ref changes.
     *
     * Note that the rules of React's immutable state still apply: updating a ref with the same value will not trigger a re-render.
     */
    useLazyRefState<A, E>(ref: LazyRef.LazyRef<A, E, R>): [A, React.Dispatch<React.SetStateAction<A>>] {
        const runSync = this.useRunSync()

        const initialState = React.useMemo(() => runSync(ref), [])
        const [reactStateValue, setReactStateValue] = React.useState(initialState)

        this.useFork(Stream.runForEach(ref.changes, v => Effect.sync(() =>
            setReactStateValue(v)
        )), [ref])

        const setValue = React.useCallback((setStateAction: React.SetStateAction<A>) =>
            runSync(LazyRef.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            )),
        [ref])

        return [reactStateValue, setValue]
    }

}


export interface RenderOptions {
    /** Prevents re-executing the effect when the Effect runtime or context changes. Defaults to `false`. */
    readonly doNotReExecuteOnRuntimeOrContextChange?: boolean
}

export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}


export const make = <T extends Array<unknown>>(
    ...contexts: [...{ [K in keyof T]: ReffuseContext.ReffuseContext<T[K]> }]
): Reffuse<T[number]> =>
    new Reffuse(contexts)
