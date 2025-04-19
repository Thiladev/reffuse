import { Effect, Effectable, PubSub, Readable, Ref, Stream, Subscribable, SubscriptionRef, SynchronizedRef } from "effect"


export interface SubscriptionSubRef<in out A> extends SubscriptionRef.SubscriptionRef<A> {
    /**
     * A stream containing the current value of the `Ref` as well as all changes
     * to that value.
     */
    readonly changes: Stream.Stream<A>
}

const synchronizedRefVariance = { _A: (_: any) => _ }
const subscriptionRefVariance = { _A: (_: any) => _ }

class SubscriptionSubRefImpl<in out A> extends Effectable.Class<A> implements SubscriptionSubRef<A> {
    readonly [Readable.TypeId]: Readable.TypeId = Readable.TypeId
    readonly [Subscribable.TypeId]: Subscribable.TypeId = Subscribable.TypeId
    readonly [Ref.RefTypeId]: Ref.Ref.Variance<A>[Ref.RefTypeId] = { _A: (_: any) => _ }
    readonly [SynchronizedRef.SynchronizedRefTypeId]: SynchronizedRef.SynchronizedRef.Variance<A>[SynchronizedRef.SynchronizedRefTypeId] = synchronizedRefVariance
    readonly [SubscriptionRef.SubscriptionRefTypeId]: SubscriptionRef.SubscriptionRef.Variance<A>[SubscriptionRef.SubscriptionRefTypeId] = subscriptionRefVariance

    constructor(
        readonly ref: Ref.Ref<A>,
        readonly pubsub: PubSub.PubSub<A>,
        readonly semaphore: Effect.Semaphore,
    ) {
        super()
        this.get = Ref.get(this.ref)
    }

    commit() {
        return this.get
    }

    readonly get: Effect.Effect<A>

    get changes(): Stream.Stream<A> {
        return Ref.get(this.ref).pipe(
            Effect.flatMap(a => Effect.map(
                Stream.fromPubSub(this.pubsub, { scoped: true }),
                s => Stream.concat(Stream.make(a), s),
            )),

            this.semaphore.withPermits(1),
            Stream.unwrapScoped,
        )
    }

    modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<B> {
        return this.modifyEffect((a) => Effect.succeed(f(a)))
    }

    modifyEffect<B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R> {
        return Ref.get(this.ref).pipe(
            Effect.flatMap(f),
            Effect.flatMap(([b, a]) => Ref.set(this.ref, a).pipe(
                Effect.as(b),
                Effect.zipLeft(PubSub.publish(this.pubsub, a))
            )),

            this.semaphore.withPermits(1)
        )
    }
}
