import type { Stream, SubscriptionRef, SynchronizedRef, Unify } from "effect"


export interface SubscriptionSubRef<in out A> extends SynchronizedRef.SynchronizedRef<A> {
  readonly parent: Ref.Ref<A>
  /** @internal */
  readonly pubsub: PubSub.PubSub<A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  readonly changes: Stream.Stream<A>
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: SubscriptionRefUnify<this>
  readonly [Unify.ignoreSymbol]?: SubscriptionRefUnifyIgnore
}
