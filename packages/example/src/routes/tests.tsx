import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect, Option, Scope } from "effect"
import { useEffect, useState } from "react"


const makeUuid = Effect.provide(makeUuid4, GetRandomValues.CryptoRandom)


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    const runSync = R.useRunSync()

    const [uuid, setUuid] = useState(R.useMemo(() => makeUuid, []))
    const generateUuid = R.useCallbackSync(() => makeUuid.pipe(
        Effect.tap(v => Effect.sync(() => setUuid(v)))
    ), [])

    const uuidStream = R.useStreamFromReactiveValues([uuid])
    const uuidStreamLatestValue = R.useSubscribeStream(uuidStream)

    const scope = R.useScope([uuid])

    useEffect(() => Effect.addFinalizer(() => Console.log("Scope cleanup!")).pipe(
        Effect.andThen(Console.log("Scope changed")),
        Effect.provideService(Scope.Scope, scope),
        runSync,
    ), [scope, runSync])

    return (
        <Flex direction="column" justify="center" align="center" gap="2">
            <Text>{uuid}</Text>
            <Button onClick={generateUuid}>Generate UUID</Button>
            <Text>
                {Option.match(uuidStreamLatestValue, {
                    onSome: ([v]) => v,
                    onNone: () => <></>,
                })}
            </Text>
        </Flex>
    )
}
