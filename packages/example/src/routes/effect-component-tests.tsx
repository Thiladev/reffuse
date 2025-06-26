import { Box, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, ManagedRuntime } from "effect"
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
        )).pipe(
            Effect.scoped
        ))}
    </>
}


const MyTestComponent = Effect.fn(function* MyTestComponent(props?: { readonly value?: string }) {
    const [state, setState] = React.useState("value")
    const effectValue = yield* Effect.succeed(`state: ${ state }`)

    yield* ReactHook.useEffect(() => Effect.andThen(
        Effect.addFinalizer(() => Console.log("MyTestComponent umounted")),
        Console.log("MyTestComponent mounted"),
    ), [])

    return <>
        <Text>{effectValue}</Text>

        <Box>
            <TextField.Root
                value={state}
                onChange={e => setState(e.target.value)}
            />
        </Box>
    </>
})
