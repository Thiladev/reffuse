import { type Context, Effect, ExecutionStrategy, Exit, type Fiber, Layer, Match, Option, pipe, Pipeable, PubSub, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
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

export interface UseScopeOptions extends RenderOptions, ScopeOptions {
    readonly scope?: Scope.Scope
    readonly finalizerExecutionMode?: "sync" | "fork"
}

export type RefsA<T extends readonly SubscriptionRef.SubscriptionRef<any>[]> = {
    [K in keyof T]: Effect.Effect.Success<T[K]>
}


export abstract class ReffuseNamespace<R> {
    declare ["constructor"]: ReffuseNamespaceClass<R>

    constructor() {
        this.SubRefFromGetSet = this.SubRefFromGetSet.bind(this as any) as any
        this.SubRefFromPath = this.SubRefFromPath.bind(this as any) as any
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

    useScope<R>(
        this: ReffuseNamespace<R>,
        deps: React.DependencyList = [],
        options?: UseScopeOptions,
    ): readonly [scope: Scope.Scope, layer: Layer.Layer<Scope.Scope>] {
        const runSync = this.useRunSync()
        const runFork = this.useRunFork()

        const makeScope = React.useMemo(() => options?.scope
            ? Scope.fork(options.scope, options.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
            : Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential),
        [options?.scope])

        const closeScope = (scope: Scope.CloseableScope) => Scope.close(scope, Exit.void).pipe(
            effect => Match.value(options?.finalizerExecutionMode ?? "sync").pipe(
                Match.when("sync", () => { runSync(effect) }),
                Match.when("fork", () => { runFork(effect) }),
                Match.exhaustive,
            )
        )

        const [isInitialRun, initialScope] = React.useMemo(() => runSync(
            Effect.all([Ref.make(true), makeScope])
        ), [makeScope])

        const [scope, setScope] = React.useState(initialScope)

        React.useEffect(() => isInitialRun.pipe(
            Effect.if({
                onTrue: () => Effect.as(
                    Ref.set(isInitialRun, false),
                    () => closeScope(initialScope),
                ),

                onFalse: () => makeScope.pipe(
                    Effect.tap(v => Effect.sync(() => setScope(v))),
                    Effect.map(v => () => closeScope(v)),
                ),
            }),

            runSync,
        ), [
            makeScope,
            ...options?.doNotReExecuteOnRuntimeOrContextChange ? [] : [runSync, runFork],
            ...deps,
        ])

        return React.useMemo(() => [scope, Layer.succeed(Scope.Scope, scope)] as const, [scope])
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

    useRef<A, E, R>(
        this: ReffuseNamespace<R>,
        initialValue: () => Effect.Effect<A, E, R>,
    ): SubscriptionRef.SubscriptionRef<A> {
        return this.useMemo(
            () => Effect.flatMap(initialValue(), SubscriptionRef.make),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true }, // Do not recreate the ref when the context changes
        )
    }

    useRefFromReactiveValue<A, R>(
        this: ReffuseNamespace<R>,
        value: A,
    ): SubscriptionRef.SubscriptionRef<A> {
        const ref = this.useRef(() => Effect.succeed(value))
        this.useEffect(() => Ref.set(ref, value), [value], { doNotReExecuteOnRuntimeOrContextChange: true })
        return ref
    }

    useSubRefFromGetSet<A, B, R>(
        this: ReffuseNamespace<R>,
        parent: SubscriptionRef.SubscriptionRef<B>,
        getter: (parentValue: B) => A,
        setter: (parentValue: B, value: A) => B,
    ): SubscriptionSubRef.SubscriptionSubRef<A, B> {
        return React.useMemo(
            () => SubscriptionSubRef.makeFromGetSet(parent, getter, setter),
            [parent],
        )
    }

    useSubRefFromPath<B, const P extends PropertyPath.Paths<B>, R>(
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

    useStreamFromReactiveValues<const A extends React.DependencyList, R>(
        this: ReffuseNamespace<R>,
        values: A,
    ): Stream.Stream<A> {
        const [, scopeLayer] = this.useScope([], { finalizerExecutionMode: "fork" })

        const { latest, pubsub, stream } = this.useMemo(() => Effect.Do.pipe(
            Effect.bind("latest", () => Ref.make(values)),
            Effect.bind("pubsub", () => Effect.acquireRelease(PubSub.unbounded<A>(), PubSub.shutdown)),
            Effect.let("stream", ({ latest, pubsub }) => Ref.get(latest).pipe(
                Effect.flatMap(a => Effect.map(
                    Stream.fromPubSub(pubsub, { scoped: true }),
                    s => Stream.concat(Stream.make(a), s),
                )),
                Stream.unwrapScoped,
            )),
            Effect.provide(scopeLayer),
        ), [scopeLayer], { doNotReExecuteOnRuntimeOrContextChange: true })

        this.useEffect(() => Ref.set(latest, values).pipe(
            Effect.andThen(PubSub.publish(pubsub, values)),
            Effect.unlessEffect(PubSub.isShutdown(pubsub)),
        ), values, { doNotReExecuteOnRuntimeOrContextChange: true })

        return stream
    }

    useSubscribeStream<A, E, R>(
        this: ReffuseNamespace<R>,
        stream: Stream.Stream<A, E, R>,
    ): Option.Option<A>
    useSubscribeStream<A, E, IE, R>(
        this: ReffuseNamespace<R>,
        stream: Stream.Stream<A, E, R>,
        initialValue: () => Effect.Effect<A, IE, R>,
    ): Option.Some<A>
    useSubscribeStream<A, E, IE, R>(
        this: ReffuseNamespace<R>,
        stream: Stream.Stream<A, E, R>,
        initialValue?: () => Effect.Effect<A, IE, R>,
    ): Option.Option<A> {
        const [reactStateValue, setReactStateValue] = React.useState(this.useMemo(
            () => initialValue
                ? Effect.map(initialValue(), Option.some)
                : Effect.succeed(Option.none()),
            [],
            { doNotReExecuteOnRuntimeOrContextChange: true },
        ))

        this.useFork(() => Stream.runForEach(
            Stream.changesWith(stream, (x, y) => x === y),
            v => Effect.sync(() => setReactStateValue(Option.some(v))),
        ), [stream])

        return reactStateValue
    }


    SubRefFromGetSet<A, B, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly parent: SubscriptionRef.SubscriptionRef<B>,
            readonly getter: (parentValue: B) => A,
            readonly setter: (parentValue: B, value: A) => B,
            readonly children: (subRef: SubscriptionSubRef.SubscriptionSubRef<A, B>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useSubRefFromGetSet(props.parent, props.getter, props.setter))
    }

    SubRefFromPath<B, const P extends PropertyPath.Paths<B>, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly parent: SubscriptionRef.SubscriptionRef<B>,
            readonly path: P,
            readonly children: (subRef: SubscriptionSubRef.SubscriptionSubRef<PropertyPath.ValueFromPath<B, P>, B>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useSubRefFromPath(props.parent, props.path))
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

    SubscribeStream<A, E, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly stream: Stream.Stream<A, E, R>
            readonly children: (latestValue: Option.Option<A>) => React.ReactNode
        },
    ): React.ReactNode
    SubscribeStream<A, E, IE, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly stream: Stream.Stream<A, E, R>
            readonly initialValue: () => Effect.Effect<A, IE, R>
            readonly children: (latestValue: Option.Some<A>) => React.ReactNode
        },
    ): React.ReactNode
    SubscribeStream<A, E, IE, R>(
        this: ReffuseNamespace<R>,
        props: {
            readonly stream: Stream.Stream<A, E, R>
            readonly initialValue?: () => Effect.Effect<A, IE, R>
            readonly children: (latestValue: Option.Some<A>) => React.ReactNode
        },
    ): React.ReactNode {
        return props.children(this.useSubscribeStream(props.stream, props.initialValue as () => Effect.Effect<A, IE, R>))
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
