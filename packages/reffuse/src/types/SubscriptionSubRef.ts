import { Effect, Effectable, Readable, Ref, Stream, Subscribable, SubscriptionRef, SynchronizedRef } from "effect"


export interface SubscriptionSubRef<in out A, in out B> extends SubscriptionRef.SubscriptionRef<A> {
    readonly parent: SubscriptionRef.SubscriptionRef<B>
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
        readonly parent: SubscriptionRef.SubscriptionRef<B>,
        readonly getter: (parentValue: B) => A,
        readonly setter: (parentValue: B, value: A) => B,
    ) {
        super()
        this.get = Ref.get(this.parent).pipe(Effect.map(this.getter))
    }

    commit() {
        return this.get
    }

    get changes(): Stream.Stream<A> {
        return this.get.pipe(
            Effect.map(a => this.parent.changes.pipe(
                Stream.map(this.getter),
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
            Effect.bind("b", () => Ref.get(this.parent)),
            Effect.bind("ca", ({ b }) => f(this.getter(b))),
            Effect.tap(({ b, ca: [, a] }) => Ref.set(this.parent, this.setter(b, a))),
            Effect.map(({ ca: [c] }) => c),
        )
    }
}


export const makeFromGetSet = <A, B>(
    parent: SubscriptionRef.SubscriptionRef<B>,
    getter: (parentValue: B) => A,
    setter: (parentValue: B, value: A) => B,
): SubscriptionSubRef<A, B> => new SubscriptionSubRefImpl(parent, getter, setter)
