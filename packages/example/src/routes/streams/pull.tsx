import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Option, Random, Stream } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/streams/pull")({
    component: RouteComponent,
})

function RouteComponent() {
    const stream = useMemo(() => Stream.repeatEffect(Random.nextInt), [])
    const [value, pull] = R.usePullStream(stream)
    const pullNext = R.useCallbackSync(() => pull, [pull])

    return (
        <Flex direction="column" align="center" gap="2">
            {Option.isSome(value) && <Text>{value.value}</Text>}
            <Button onClick={pullNext}>Pull next</Button>
        </Flex>
    )
}
