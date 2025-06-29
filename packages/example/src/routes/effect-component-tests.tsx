import { Box, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, ManagedRuntime, SubscriptionRef } from "effect"
import { ReactComponent, ReactHook } from "effect-components"
import * as React from "react"


export const Route = createFileRoute("/effect-component-tests")({
    component: RouteComponent,
})

function RouteComponent() {
    const runtime = React.useMemo(() => ManagedRuntime.make(Layer.empty), [])

    return <>
        {runtime.runSync(ReactComponent.use(MyTestComponent, Component => (
            <Component />
        )))}
    </>
}


class TestService extends Effect.Service<TestService>()("TestService", {
    effect: Effect.bind(Effect.Do, "ref", () => SubscriptionRef.make("value")),
}) {}

const MyTestComponent = Effect.fn(function* MyTestComponent(props?: { readonly value?: string }) {
    const [state, setState] = React.useState("value")

    // yield* ReactHook.useEffect(() => Effect.andThen(
    //     Effect.addFinalizer(() => Console.log("MyTestComponent umounted")),
    //     Console.log("MyTestComponent mounted"),
    // ), [])

    return <>
        <Box>
            <TextField.Root
                value={state}
                onChange={e => setState(e.target.value)}
            />
        </Box>
    </>
})
console.log(MyTestComponent)
