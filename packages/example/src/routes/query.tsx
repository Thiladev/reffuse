import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Button, Container, Flex, Slider, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import * as AsyncData from "@typed/async-data"
import { Array, Console, Effect, flow, Option, Schema } from "effect"
import { useState } from "react"


export const Route = createFileRoute("/query")({
    component: RouteComponent
})


const Result = Schema.Array(Schema.String)

function RouteComponent() {
    const runSync = R.useRunSync()

    const [count, setCount] = useState(1)

    const query = R.useQuery({
        query: () => Console.log(`Querying ${ count } IDs...`).pipe(
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.andThen(HttpClient.get(`https://www.uuidtools.com/api/generate/v4/count/${ count }`)),
            HttpClient.withTracerPropagation(false),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Result)),
            Effect.scoped,
        ),
        key: ["uuid4", count],
    })

    const [state] = R.useRefState(query.state)


    return (
        <Container>
            <Flex direction="column" align="center" gap="2">
                <Slider
                    min={1}
                    max={100}
                    value={[count]}
                    onValueChange={flow(
                        Array.head,
                        Option.getOrThrow,
                        setCount,
                    )}
                />

                <Text>
                    {AsyncData.match(state, {
                        NoData: () => "No data yet",
                        Loading: () => "Loading...",
                        Success: (value, { isRefreshing, isOptimistic }) =>
                            `Value: ${value} ${isRefreshing ? "(refreshing)" : ""} ${isOptimistic ? "(optimistic)" : ""}`,
                        Failure: (cause, { isRefreshing }) =>
                            `Error: ${cause} ${isRefreshing ? "(refreshing)" : ""}`,
                    })}
                </Text>

                <Button onClick={() => runSync(query.refresh)}>Refresh</Button>
            </Flex>
        </Container>
    )
}
