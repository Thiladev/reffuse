import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect, Ref } from "effect"
import { useMemo } from "react"
import { SubscriptionSubRef } from "reffuse/types"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    const deepRef = R.useRef({ value: "poulet" })
    const deepValueRef = useMemo(() => SubscriptionSubRef.make(
        deepRef,
        b => b.value,
        (b, a) => ({ ...b, value: a }),
    ), [deepRef])

    // const value = R.useMemoScoped(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
    //     Effect.andThen(makeUuid4),
    //     Effect.provide(GetRandomValues.CryptoRandom),
    // ), [])
    // console.log(value)

    R.useFork(() => Effect.addFinalizer(() => Console.log("cleanup")).pipe(
        Effect.andThen(Console.log("ouient")),
        Effect.delay("1 second"),
    ), [])


    const uuidRef = R.useRef("none")
    const anotherRef = R.useRef(69)


    const logValue = R.useCallbackSync(Effect.fn(function*(value: string) {
        yield* Effect.log(value)
    }), [])

    const generateUuid = R.useCallbackSync(() => makeUuid4.pipe(
        Effect.provide(GetRandomValues.CryptoRandom),
        Effect.tap(v => Ref.set(uuidRef, v)),
        Effect.tap(v => Ref.set(deepValueRef, v)),
    ), [])


    return (
        <Flex direction="row" justify="center" align="center" gap="2">
            <R.SubscribeRefs refs={[uuidRef, anotherRef]}>
                {(uuid, anotherRef) => <Text>{uuid} / {anotherRef}</Text>}
            </R.SubscribeRefs>

            <R.SubscribeRefs refs={[deepRef, deepValueRef]}>
                {(deep, deepValue) => <Text>{JSON.stringify(deep)} / {deepValue}</Text>}
            </R.SubscribeRefs>

            <Button onClick={() => logValue("test")}>Log value</Button>
            <Button onClick={() => generateUuid()}>Generate UUID</Button>
        </Flex>
    )
}
