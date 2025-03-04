import { Button, Container, Flex, Text } from "@radix-ui/themes"
import * as AsyncData from "@typed/async-data"
import { R } from "../reffuse"
import { Uuid4Query } from "../services"


export function Uuid4QueryService() {
    const runSync = R.useRunSync()

    const { state, refresh } = R.useMemo(() => Uuid4Query.Uuid4Query, [])
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
