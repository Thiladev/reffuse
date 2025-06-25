import { Box, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, ManagedRuntime, Runtime } from "effect"
import { ReactComponent } from "effect-components"
import * as React from "react"


export const Route = createFileRoute("/effect-component-tests")({
    component: RouteComponent,
})

function RouteComponent() {
    const runtime = React.useMemo(() => ManagedRuntime.make(Layer.empty), [])

    return <>
        {runtime.runSync(MyTestComponent.use(Component => (
            <Component />
        )))}
    </>
}


const MyTestComponent = ReactComponent.make(Effect.fn(function* MyTestComponent(props?: { readonly value?: string }) {
    const [state, setState] = React.useState("value")
    const effectValue = yield* Effect.succeed(`state: ${ state }`)

    yield* useEffect(() => Console.log("ouient"), [])

    return <>
        <Text>{effectValue}</Text>

        <Box>
            <TextField.Root
                value={state}
                onChange={e => setState(e.target.value)}
            />
        </Box>
    </>
}))


const useEffect = <A, E, R>(
    effect: () => Effect.Effect<A, E, R>,
    deps?: React.DependencyList,
): Effect.Effect<void, never, R> => Effect.gen(function* useEffect() {
    const runtime = yield* Effect.runtime<R>()

    React.useEffect(() => Runtime.runSync(runtime)(Effect.asVoid(effect())), deps)
})
