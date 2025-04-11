import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect, Stream } from "effect"
import { useState } from "react"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    // const value = R.useMemoScoped(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
    //     Effect.andThen(makeUuid4),
    //     Effect.provide(GetRandomValues.CryptoRandom),
    // ), [])
    // console.log(value)

    R.useFork(() => Effect.addFinalizer(() => Console.log("cleanup")).pipe(
        Effect.andThen(Console.log("ouient")),
        Effect.delay("1 second"),
    ), [])


    const aRef = R.useRef("a value")
    const anotherRef = R.useRef(69)

    const res = R.useRefsState({ aRef, anotherRef })


    const [reactValue, setReactValue] = useState("initial")
    const reactValueStream = R.useStreamFromValues([reactValue])
    R.useFork(() => Stream.runForEach(reactValueStream, Console.log), [reactValueStream])


    const logValue = R.useCallbackSync(Effect.fn(function*(value: string) {
        yield* Effect.log(value)
    }), [])

    const generateUuid = R.useCallbackSync(() => makeUuid4.pipe(
        Effect.provide(GetRandomValues.CryptoRandom),
        Effect.map(setReactValue),
    ), [])


    return (
        <Flex direction="row" justify="center" align="center" gap="2">
            <R.RefState ref={aRef}>
                {([aValue]) => <Text>{aValue}</Text>}
            </R.RefState>

            <Button onClick={() => logValue("test")}>Log value</Button>
            <Button onClick={() => generateUuid()}>Generate UUID</Button>
        </Flex>
    )
}
