import { type Context, Effect, ExecutionStrategy, Exit, type Fiber, type Layer, Option, pipe, Pipeable, Queue, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseRuntime from "./ReffuseRuntime.js"
import { type PropertyPath, SetStateAction, SubscriptionSubRef } from "./types/index.js"


export interface RenderOptions {
    /** Prevents re-executing the effect when the Effect runtime or context changes. Defaults to `false`. */
    readonly doNotReExecuteOnRuntimeOrContextChange?: boolean
}

export interface ScopeOptions {
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}

export type RefsA<T extends readonly SubscriptionRef.SubscriptionRef<any>[]> = {
    [K in keyof T]: Effect.Effect.Success<T[K]>
}


export abstract class ReffuseNamespace<R> {
    declare ["constructor"]: ReffuseNamespaceClass<R>

    constructor() {
        this.SubRef = this.SubRef.bind(this as any) as any
        this.SubscribeRefs = this.SubscribeRefs.bind(this as any) as any
        this.RefState = this.RefState.bind(this as any) as any
        this.SubscribeStream = this.SubscribeStream.bind(this as any) as any
    }


    useContext<R>(this: ReffuseNamespace<R>): Context.Context<R> {
        return ReffuseContext.useMergeAll(...this.constructor.contexts)
    }

    useLayer<R>(this: ReffuseNamespace<R>): Layer.Layer<R> {
        return ReffuseContext.useMergeAllLayers(...this.constructor.contexts)
    }


    useRunSync<R>(this: ReffuseNamespace<R>): <A, E>(effect: Effect.Effect<A, E, R>) => A {
        const runtime = ReffuseRuntime.useRuntime()
        const context = this.useContext()

        return React.useCallback(effect => effect.pipe(
            Effect.provide(context),
            Runtime.runSync(runtime),
        ), [runtime, context])
    }

    useRunPromise<R>(this: ReffuseNamespace<R>): <A, E>(
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

    useRunFork<R>(this: ReffuseNamespace<R>): <A, E>(
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

    useRunCallback<R>(this: ReffuseNamespace<R>): <A, E>(
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
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
        this: ReffuseNamespace<R>,
        initialValue: A,
    ): SubscriptionRef.SubscriptionRef<A> {
        return this.useMemo(
            () => SubscriptionRef.make(initialValue),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true }, // Do not recreate the ref when the context changes
        )
    }

    useRefFromReactiveValue<A, R>(
        this: ReffuseNamespace<R>,
        value: A,
    ): SubscriptionRef.SubscriptionRef<A> {
        const ref = this.useRef(value)
        this.useEffect(() => Ref.set(ref, value), [value], { doNotReExecuteOnRuntimeOrContextChange: true })
        return ref
    }

    useSubRef<B, const P extends PropertyPath.Paths<B>, R>(
        this: ReffuseNamespace<R>,
        parent: SubscriptionRef.SubscriptionRef<B>,
        path: P,
    ): SubscriptionSubRef.SubscriptionSubRef<PropertyPath.ValueFromPath<B, P>, B> {
        return React.useMemo(
            () => SubscriptionSubRef.makeFromPath(parent, path),
            [parent],
        )
    }

    useSubscribeRefs<
        const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[],
        R,
    >(
        this: ReffuseNamespace<R>,
        ...refs: Refs
    ): RefsA<Refs> {
        const [reactStateValue, setReactStateValue] = React.useState(this.useMemo(
            () => Effect.all(refs as readonly SubscriptionRef.SubscriptionRef<any>[]),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true },
        ) as RefsA<Refs>)

        this.useFork(() => pipe(
            refs.map(ref => Stream.changesWith(ref.changes, (x, y) => x === y)),
            streams => Stream.zipLatestAll(...streams),
            Stream.runForEach(v =>
                Effect.sync(() => setReactStateValue(v as RefsA<Refs>))
            ),
        ), refs)

        return reactStateValue
    }

    /**
     * Binds the state of a `SubscriptionRef` to the state of the React component.
     *
     * Returns a [value, setter] tuple just like `React.useState` and triggers a re-render everytime the value held by the ref changes.
     *
     * Note that the rules of React's immutable state still apply: updating a ref with the same value will not trigger a re-render.
     */
    useRefState<A, R>(
        this: ReffuseNamespace<R>,
        ref: SubscriptionRef.SubscriptionRef<A>,
    ): [A, React.Dispatch<React.SetStateAction<A>>] {
        const [reactStateValue, setReactStateValue] = React.useState(this.useMemo(
            () => ref,
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true },
        ))

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

    useStreamFromValues<const A extends React.DependencyList, R>(
        this: ReffuseNamespace<R>,
        values: A,
    ): Stream.Stream<A> {
        const [queue, stream] = this.useMemo(() => Queue.unbounded<A>().pipe(
            Effect.map(queue => [queue, Stream.fromQueue(queue)] as const)
        ), [])

        this.useEffect(() => Queue.offer(queue, values), values)

        return stream
    }

    useSubscribeStream<A, InitialA extends A | undefined, E, R>(
        this: ReffuseNamespace<R>,
        stream: Stream.Stream<A, E, R>,
        initialValue?: InitialA,
    ): InitialA extends A ? Option.Some<A> : Option.Option<A> {
        const [reactStateValue, setReactStateValue] = React.useState<Option.Option<A>>(Option.fromNullable(initialValue))

        this.useFork(() => Stream.runForEach(
            Stream.changesWith(stream, (x, y) => x === y),
            v => Effect.sync(() => setReactStateValue(Option.some(v))),
        ), [stream])

        return reactStateValue as InitialA extends A ? Option.Some<A> : Option.Option<A>
    }


    SubRef<B, const P extends PropertyPath.Paths<B>, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly parent: SubscriptionRef.SubscriptionRef<B>,
            readonly path: P,
            readonly children: (subRef: SubscriptionSubRef.SubscriptionSubRef<PropertyPath.ValueFromPath<B, P>, B>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useSubRef(props.parent, props.path))
    }

    SubscribeRefs<
        const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[],
        R,
    >(
        this: ReffuseNamespace<R>,
        props: {
            readonly refs: Refs
            readonly children: (...args: RefsA<Refs>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(...this.useSubscribeRefs(...props.refs))
    }

    RefState<A, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly ref: SubscriptionRef.SubscriptionRef<A>
            readonly children: (state: [A, React.Dispatch<React.SetStateAction<A>>]) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useRefState(props.ref))
    }

    SubscribeStream<A, InitialA extends A | undefined, E, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly stream: Stream.Stream<A, E, R>
            readonly initialValue?: InitialA
            readonly children: (latestValue: InitialA extends A ? Option.Some<A> : Option.Option<A>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useSubscribeStream(props.stream, props.initialValue))
    }
}


export interface ReffuseNamespace<R> extends Pipeable.Pipeable {}

ReffuseNamespace.prototype.pipe = function pipe() {
    return Pipeable.pipeArguments(this, arguments)
};


export interface ReffuseNamespaceClass<R> extends Pipeable.Pipeable {
    new(): ReffuseNamespace<R>
    make<Self>(this: new () => Self): Self
    readonly contexts: readonly ReffuseContext.ReffuseContext<R>[]
}

(ReffuseNamespace as ReffuseNamespaceClass<any>).make = function make() {
    return new this()
};

(ReffuseNamespace as ReffuseNamespaceClass<any>).pipe = function pipe() {
    return Pipeable.pipeArguments(this, arguments)
};


export const makeClass = (): ReffuseNamespaceClass<never> => (
    class extends (ReffuseNamespace<never> as ReffuseNamespaceClass<never>) {
        static readonly contexts = []
    }
)
