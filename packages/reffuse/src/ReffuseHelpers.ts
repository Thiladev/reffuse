import { type Context, Effect, ExecutionStrategy, Exit, type Fiber, type Layer, Pipeable, Queue, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseRuntime from "./ReffuseRuntime.js"
import * as SetStateAction from "./SetStateAction.js"


export interface RenderOptions {
    /** Prevents re-executing the effect when the Effect runtime or context changes. Defaults to `false`. */
    readonly doNotReExecuteOnRuntimeOrContextChange?: boolean
}

export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}


export abstract class ReffuseHelpers<R> {
    declare ["constructor"]: ReffuseHelpersClass<R>

    constructor() {
        this.RefState = this.RefState.bind(this as any) as any
    }


    useContext<R>(this: ReffuseHelpers<R>): Context.Context<R> {
        return ReffuseContext.useMergeAll(...this.constructor.contexts)
    }

    useLayer<R>(this: ReffuseHelpers<R>): Layer.Layer<R> {
        return ReffuseContext.useMergeAllLayers(...this.constructor.contexts)
    }


    useRunSync<R>(this: ReffuseHelpers<R>): <A, E>(effect: Effect.Effect<A, E, R>) => A {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(effect => effect.pipe(
            Effect.provide(context),
            Runtime.runSync(runtime),
        ), [runtime, context])
    }

    useRunPromise<R>(this: ReffuseHelpers<R>): <A, E>(
        effect: Effect.Effect<A, E, R>,
        options?: { readonly signal?: AbortSignal },
    ) => Promise<A> {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback((effect, options) => effect.pipe(
            Effect.provide(context),
            effect => Runtime.runPromise(runtime)(effect, options),
        ), [runtime, context])
    }

    useRunFork<R>(this: ReffuseHelpers<R>): <A, E>(
        effect: Effect.Effect<A, E, R>,
        options?: Runtime.RunForkOptions,
    ) => Fiber.RuntimeFiber<A, E> {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback((effect, options) => effect.pipe(
            Effect.provide(context),
            effect => Runtime.runFork(runtime)(effect, options),
        ), [runtime, context])
    }

    useRunCallback<R>(this: ReffuseHelpers<R>): <A, E>(
        effect: Effect.Effect<A, E, R>,
        options?: Runtime.RunCallbackOptions<A, E>,
    ) => Runtime.Cancel<A, E> {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback((effect, options) => effect.pipe(
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
    useMemo<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
        options?: RenderOptions,
    ): A {
        const runSync = this.useRunSync()

        return React.useMemo(() => runSync(effect()), [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
        ])
    }

    useMemoScoped<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R | Scope.Scope>,
        deps: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): A {
        const runSync = this.useRunSync()

        const [isInitialRun, initialScope, initialValue] = React.useMemo(() => Effect.Do.pipe(
            Effect.bind("isInitialRun", () => Ref.make(true)),
            Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy)),
            Effect.bind("value", ({ scope }) => Effect.provideService(effect(), Scope.Scope, scope)),
            Effect.map(({ isInitialRun, scope, value }) => [isInitialRun, scope, value] as const),
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
                    Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy)),
                    Effect.bind("value", ({ scope }) => Effect.provideService(effect(), Scope.Scope, scope)),
                    Effect.tap(({ value }) =>
                        Effect.sync(() => setValue(value))
                    ),
                    Effect.map(({ scope }) =>
                        () => runSync(Scope.close(scope, Exit.void))
                    ),
                ),
            }),

            runSync,
        ), [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
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
     * useEffect(() => Effect.addFinalizer(() => Console.log("Component unmounted")).pipe(
     *     Effect.flatMap(() => Console.log("Component mounted"))
     * ))
     * ```
     *
     * Plain React equivalent:
     * ```
     * React.useEffect(() => {
     *     console.log("Component mounted")
     *     return () => { console.log("Component unmounted") }
     * }, [])
     * ```
     */
    useEffect<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()

        React.useEffect(() => {
            const scope = Scope.make(options?.finalizerExecutionStrategy).pipe(
                Effect.tap(scope => Effect.provideService(effect(), Scope.Scope, scope)),
                runSync,
            )

            return () => { runSync(Scope.close(scope, Exit.void)) }
        }, deps && [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
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
     * useLayoutEffect(() => Effect.addFinalizer(() => Console.log("Component unmounted")).pipe(
     *     Effect.flatMap(() => Console.log("Component mounted"))
     * ))
     * ```
     *
     * Plain React equivalent:
     * ```
     * React.useLayoutEffect(() => {
     *     console.log("Component mounted")
     *     return () => { console.log("Component unmounted") }
     * }, [])
     * ```
     */
    useLayoutEffect<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()

        React.useLayoutEffect(() => {
            const scope = Scope.make(options?.finalizerExecutionStrategy).pipe(
                Effect.tap(scope => Effect.provideService(effect(), Scope.Scope, scope)),
                runSync,
            )

            return () => { runSync(Scope.close(scope, Exit.void)) }
        }, deps && [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
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
     * useFork(() => Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
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
    useFork<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & RenderOptions & ScopeOptions,
    ): void {
        const runSync = this.useRunSync()
        const runFork = this.useRunFork()

        React.useEffect(() => {
            const scope = runSync(options?.scope
                ? Scope.fork(options.scope, options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
                : Scope.make(options?.finalizerExecutionStrategy)
            )
            runFork(Effect.provideService(effect(), Scope.Scope, scope), { ...options, scope })

            return () => { runFork(Scope.close(scope, Exit.void)) }
        }, deps && [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
        ])
    }

    usePromise<A, E, R>(
        this: ReffuseHelpers<R>,
        effect: () => Effect.Effect<A, E, R | Scope.Scope>,
        deps?: React.DependencyList,
        options?: { readonly signal?: AbortSignal } & Runtime.RunForkOptions & RenderOptions & ScopeOptions,
    ): Promise<A> {
        const runSync = this.useRunSync()
        const runFork = this.useRunFork()

        const [value, setValue] = React.useState(Promise.withResolvers<A>().promise)

        React.useEffect(() => {
            const { promise, resolve, reject } = Promise.withResolvers<A>()
            setValue(promise)

            const scope = runSync(options?.scope
                ? Scope.fork(options.scope, options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
                : Scope.make(options?.finalizerExecutionStrategy)
            )

            const cleanup = () => { runFork(Scope.close(scope, Exit.void)) }
            if (options?.signal)
                options.signal.addEventListener("abort", cleanup)

            effect().pipe(
                Effect.provideService(Scope.Scope, scope),
                Effect.match({
                    onSuccess: resolve,
                    onFailure: reject,
                }),
                effect => runFork(effect, { ...options, scope }),
            )

            return () => {
                if (options?.signal)
                    options.signal.removeEventListener("abort", cleanup)

                cleanup()
            }
        }, deps && [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
        ])

        return value
    }

    useCallbackSync<Args extends unknown[], A, E, R>(
        this: ReffuseHelpers<R>,
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
        options?: RenderOptions,
    ): (...args: Args) => A {
        const runSync = this.useRunSync()

        return React.useCallback((...args) => runSync(callback(...args)), [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync],
            ...deps,
        ])
    }

    useCallbackPromise<Args extends unknown[], A, E, R>(
        this: ReffuseHelpers<R>,
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
        options?: { readonly signal?: AbortSignal } & RenderOptions,
    ): (...args: Args) => Promise<A> {
        const runPromise = this.useRunPromise()

        return React.useCallback((...args) => runPromise(callback(...args), options), [
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runPromise],
            ...deps,
        ])
    }

    useRef<A, R>(
        this: ReffuseHelpers<R>,
        value: A,
    ): SubscriptionRef.SubscriptionRef<A> {
        return this.useMemo(
            () => SubscriptionRef.make(value),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true }, // Do not recreate the ref when the context changes
        )
    }

    /**
     * Binds the state of a `SubscriptionRef` to the state of the React component.
     *
     * Returns a [value, setter] tuple just like `React.useState` and triggers a re-render everytime the value held by the ref changes.
     *
     * Note that the rules of React's immutable state still apply: updating a ref with the same value will not trigger a re-render.
     */
    useRefState<A, R>(
        this: ReffuseHelpers<R>,
        ref: SubscriptionRef.SubscriptionRef<A>,
    ): [A, React.Dispatch<React.SetStateAction<A>>] {
        const initialState = this.useMemo(() => ref, [], { doNotReExecuteOnRuntimeOrContextChange: true })
        const [reactStateValue, setReactStateValue] = React.useState(initialState)

        this.useFork(() => Stream.runForEach(
            Stream.changesWith(ref.changes, (x, y) => x === y),
            v => Effect.sync(() => setReactStateValue(v)),
        ), [ref])

        const setValue = this.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
            Ref.update(ref, prevState =>
                SetStateAction.value(setStateAction, prevState)
            ),
        [ref])

        return [reactStateValue, setValue]
    }

    useRefsState<
        const Refs extends { readonly [K in keyof Refs]: SubscriptionRef.SubscriptionRef<any> },
        R,
    >(
        this: ReffuseHelpers<R>,
        refs: Refs,
    ): {
        readonly [K in keyof Refs]: readonly [
            Effect.Effect.Success<Refs[K]>,
            React.Dispatch<React.SetStateAction<Effect.Effect.Success<Refs[K]>>>,
        ]
    } {
        // const initialState = this.useMemo(() => Effect.Do.pipe(
        //     Effect.bindAll(() => refs)
        // ), [], { doNotReExecuteOnRuntimeOrContextChange: true })

        // const [reactStateValue, setReactStateValue] = React.useState(initialState)

        // this.useFork(() => Stream.runForEach(
        //     Stream.changesWith(ref.changes, (x, y) => x === y),
        //     v => Effect.sync(() => setReactStateValue(v)),
        // ), [ref])

        // const setValue = this.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        //     Ref.update(ref, prevState =>
        //         SetStateAction.value(setStateAction, prevState)
        //     ),
        // [ref])

        // return [reactStateValue, setValue]
        return null!
    }

    useStreamFromValues<const A extends React.DependencyList, R>(
        this: ReffuseHelpers<R>,
        values: A,
    ): Stream.Stream<A> {
        const [queue, stream] = this.useMemo(() => Queue.unbounded<A>().pipe(
            Effect.map(queue => [queue, Stream.fromQueue(queue)] as const)
        ), [])

        this.useEffect(() => Queue.offer(queue, values), values)

        return stream
    }


    RefState<A, R>(
        this: ReffuseHelpers<R>,
        props: {
            readonly ref: SubscriptionRef.SubscriptionRef<A>
            readonly children: (state: [A, React.Dispatch<React.SetStateAction<A>>]) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useRefState(props.ref))
    }
}


export interface ReffuseHelpers<R> extends Pipeable.Pipeable {}

ReffuseHelpers.prototype.pipe = function pipe() {
    return Pipeable.pipeArguments(this, arguments)
};


export interface ReffuseHelpersClass<R> extends Pipeable.Pipeable {
    new(): ReffuseHelpers<R>
    make<Self>(this: new () => Self): Self
    readonly contexts: readonly ReffuseContext.ReffuseContext<R>[]
}

(ReffuseHelpers as ReffuseHelpersClass<any>).make = function make() {
    return new this()
};

(ReffuseHelpers as ReffuseHelpersClass<any>).pipe = function pipe() {
    return Pipeable.pipeArguments(this, arguments)
};


export const make = (): ReffuseHelpersClass<never> => (
    class extends (ReffuseHelpers<never> as ReffuseHelpersClass<never>) {
        static readonly contexts = []
    }
)
