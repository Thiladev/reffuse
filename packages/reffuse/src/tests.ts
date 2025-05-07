import { Console, Effect, Fiber, Ref, Stream, SubscriptionRef } from "effect"


await Effect.gen(function*() {
    const ref = yield* SubscriptionRef.make("juif")
    const stream = ref.changes

    const f1 = yield* Stream.runForEach(stream, v => Console.log(`observer 1: ${ v }`)).pipe(
        Effect.fork,
    )
    const f2 = yield* Effect.sleep("200 millis").pipe(
        Effect.andThen(Stream.runForEach(stream, v => Console.log(`observer 2: ${ v }`))),
        Effect.fork,
    )
    const f3 = yield* Effect.sleep("100 millis").pipe(
        Effect.andThen(Ref.set(ref, "adolf")),
        Effect.fork,
    )

    yield* Fiber.joinAll([f1, f2, f3])
}).pipe(
    Effect.runPromise
)
