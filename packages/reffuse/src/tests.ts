import { Effect, Exit, PubSub, Scope, Stream } from "effect"


await Effect.gen(function*() {
    const scope = yield* Scope.make()

    const pubsub = yield* PubSub.unbounded<string>()
    console.log(yield* PubSub.isShutdown(pubsub))
    const stream = yield* Stream.fromPubSub(pubsub, { scoped: true, shutdown: true }).pipe(
        Effect.provideService(Scope.Scope, scope)
    )

    yield* Scope.close(scope, Exit.void)
    console.log(yield* PubSub.isShutdown(pubsub))
}).pipe(
    Effect.runPromise,
)
