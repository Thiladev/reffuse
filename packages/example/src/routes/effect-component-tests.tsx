import { Box, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, pipe, SubscriptionRef } from "effect"
import { ReactComponent, ReactHook, ReactManagedRuntime } from "effect-components"
import * as React from "react"


class TestService extends Effect.Service<TestService>()("TestService", {
    effect: Effect.bind(Effect.Do, "ref", () => SubscriptionRef.make("value")),
}) {}

const runtime = ReactManagedRuntime.make(Layer.empty)


export const Route = createFileRoute("/effect-component-tests")({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <ReactManagedRuntime.SyncProvider runtime={runtime}>
            <MyRoute />
        </ReactManagedRuntime.SyncProvider>
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
        const [state, setState] = React.useState("value")

        yield* ReactHook.useEffect(() => Effect.andThen(
            Effect.addFinalizer(() => Console.log("MyTestComponent umounted")),
            Console.log("MyTestComponent mounted"),
        ), [])

        return <>
            <Box>
                <TextField.Root
                    value={state}
                    onChange={e => setState(e.target.value)}
                />
            </Box>
        </>
    }),

    ReactComponent.withDisplayName("MyTestComponent"),
)
