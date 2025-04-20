import { Effect, Effectable, Readable, Ref, Stream, Subscribable, SubscriptionRef, SynchronizedRef } from "effect"


export interface SubscriptionSubRef<in out A, in out B> extends SubscriptionRef.SubscriptionRef<A> {
    readonly ref: SubscriptionRef.SubscriptionRef<B>

    /**
     * A stream containing the current value of the `Ref` as well as all changes
     * to that value.
     */
    readonly changes: Stream.Stream<A>
}


const synchronizedRefVariance = { _A: (_: any) => _ }
const subscriptionRefVariance = { _A: (_: any) => _ }

class SubscriptionSubRefImpl<in out A, in out B> extends Effectable.Class<A> implements SubscriptionSubRef<A, B> {
    readonly [Readable.TypeId]: Readable.TypeId = Readable.TypeId
    readonly [Subscribable.TypeId]: Subscribable.TypeId = Subscribable.TypeId
    readonly [Ref.RefTypeId]: Ref.Ref.Variance<A>[Ref.RefTypeId] = { _A: (_: any) => _ }
    readonly [SynchronizedRef.SynchronizedRefTypeId]: SynchronizedRef.SynchronizedRef.Variance<A>[SynchronizedRef.SynchronizedRefTypeId] = synchronizedRefVariance
    readonly [SubscriptionRef.SubscriptionRefTypeId]: SubscriptionRef.SubscriptionRef.Variance<A>[SubscriptionRef.SubscriptionRefTypeId] = subscriptionRefVariance

    readonly get: Effect.Effect<A>

    constructor(
        readonly ref: SubscriptionRef.SubscriptionRef<B>,
        readonly select: (value: B) => A,
        readonly setter: (value: B, subValue: A) => B,
    ) {
        super()
        this.get = Ref.get(this.ref).pipe(Effect.map(this.select))
    }

    commit() {
        return this.get
    }

    get changes(): Stream.Stream<A> {
        return this.get.pipe(
            Effect.map(a => this.ref.changes.pipe(
                Stream.map(this.select),
                s => Stream.concat(Stream.make(a), s),
            )),
            Stream.unwrap,
        )
    }

    modify<C>(f: (a: A) => readonly [C, A]): Effect.Effect<C> {
        return this.modifyEffect(a => Effect.succeed(f(a)))
    }

    modifyEffect<C, E, R>(f: (a: A) => Effect.Effect<readonly [C, A], E, R>): Effect.Effect<C, E, R> {
        return Effect.Do.pipe(
            Effect.bind("b", () => Ref.get(this.ref)),
            Effect.bind("ca", ({ b }) => f(this.select(b))),
            Effect.tap(({ b, ca: [, a] }) => Ref.set(this.ref, this.setter(b, a))),
            Effect.map(({ ca: [c] }) => c),
        )
    }
}


export const make = <A, B>(
    ref: SubscriptionRef.SubscriptionRef<B>,
    select: (value: B) => A,
    setter: (value: B, subValue: A) => B,
): SubscriptionSubRef<A, B> => new SubscriptionSubRefImpl(ref, select, setter)
