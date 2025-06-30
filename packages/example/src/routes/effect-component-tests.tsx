import { Box, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, pipe, Ref, Runtime, SubscriptionRef } from "effect"
import { ReactComponent, ReactHook, ReactManagedRuntime } from "effect-components"


const LogLive = Layer.scopedDiscard(Effect.acquireRelease(
    Console.log("Runtime built."),
    () => Console.log("Runtime destroyed."),
))

class TestService extends Effect.Service<TestService>()("TestService", {
    effect: Effect.bind(Effect.Do, "ref", () => SubscriptionRef.make("value")),
}) {}

const runtime = ReactManagedRuntime.make(Layer.empty.pipe(
    Layer.provideMerge(LogLive),
    Layer.provideMerge(TestService.Default),
))


export const Route = createFileRoute("/effect-component-tests")({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <ReactManagedRuntime.AsyncProvider runtime={runtime}>
            <MyRoute />
        </ReactManagedRuntime.AsyncProvider>
    )
}

const MyRoute = pipe(
    Effect.fn(function*() {
        return yield* ReactComponent.use(MyTestComponent, C => <C />)
    }),
    ReactComponent.withDisplayName("MyRoute"),
    ReactComponent.withRuntime(runtime.context),
)


const MyTestComponent = pipe(
    Effect.fn(function*() {
        const runtime = yield* Effect.runtime()

        const testService = yield* TestService
        const [value] = yield* ReactHook.useSubscribeRefs(testService.ref)

        yield* ReactHook.useEffect(() => Effect.andThen(
            Effect.addFinalizer(() => Console.log("MyTestComponent umounted")),
            Console.log("MyTestComponent mounted"),
        ), [])

        return <>
            <Box>
                <TextField.Root
                    value={value}
                    onChange={e => Runtime.runSync(runtime)(Ref.set(testService.ref, e.target.value))}
                />
            </Box>
        </>
    }),

    ReactComponent.withDisplayName("MyTestComponent"),
)
