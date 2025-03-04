import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Button, Container, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import * as AsyncData from "@typed/async-data"
import { Console, Effect, Schema } from "effect"


export const Route = createFileRoute("/query")({
    component: RouteComponent
})


const Result = Schema.Tuple(Schema.String)

function RouteComponent() {
    const runSync = R.useRunSync()

    const { state, refresh } = R.useQuery({
        effect: () => Console.log("Querying...").pipe(
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.andThen(HttpClient.get("https://www.uuidtools.com/api/generate/v4")),
            HttpClient.withTracerPropagation(false),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Result)),
            Effect.scoped,
        ),
        deps: [],
    })

    const [queryState] = R.useRefState(state)


    return (
        <Container>
            <Flex direction="column" align="center" gap="2">
                <Text>
                    {AsyncData.match(queryState, {
                        NoData: () => "No data yet",
                        Loading: () => "Loading...",
                        Success: (value, { isRefreshing, isOptimistic }) =>
                            `Value: ${value} ${isRefreshing ? "(refreshing)" : ""} ${isOptimistic ? "(optimistic)" : ""}`,
                        Failure: (cause, { isRefreshing }) =>
                            `Error: ${cause} ${isRefreshing ? "(refreshing)" : ""}`,
                    })}
                </Text>

                <Button onClick={() => runSync(refresh)}>Refresh</Button>
            </Flex>
        </Container>
    )
}
