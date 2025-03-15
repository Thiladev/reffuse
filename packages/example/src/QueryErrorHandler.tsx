import { HttpClientError } from "@effect/platform"
import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes"
import { ErrorHandler } from "@reffuse/extension-query"
import { Cause, Chunk, Context, Effect, Match, Option, Queue, Stream } from "effect"
import { useState } from "react"
import { R } from "./reffuse"


export class QueryErrorHandler extends ErrorHandler.Tag("QueryErrorHandler")<QueryErrorHandler,
    HttpClientError.HttpClientError
>() {}

export const QueryErrorHandlerLive = ErrorHandler.layer(QueryErrorHandler)


export function VQueryErrorHandler() {
    const queue = R.useMemo(() => Queue.unbounded<Cause.Cause<
        ErrorHandler.Error<Context.Tag.Service<QueryErrorHandler>>
    >>(), [])

    R.useFork(() => QueryErrorHandler.pipe(Effect.flatMap(handler =>
        Stream.runForEach(handler.errors, v => Queue.offer(queue, v))
    )), [queue])

    const [failure, setFailure] = useState(R.useMemo(() => Queue.poll(queue), []))

    const next = R.useCallbackSync(() => Queue.poll(queue).pipe(
        Effect.map(setFailure)
    ), [queue])

    // R.useFork(() => QueryErrorHandler.pipe(Effect.flatMap(handler =>
    //     Stream.runForEach(handler.errors, flow(
    //         Cause.failures,
    //         Chunk.map(flow(Match.value,
    //             Match.tag("RequestError", () => Effect.sync(() => {})),
    //             Match.tag("ResponseError", () => Effect.sync(() => {})),
    //             Match.exhaustive,
    //         )),
    //         Effect.all,
    //     ))
    // )), [])


    return Option.match(failure, {
        onSome: v => (
            <AlertDialog.Root>
                <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>Error</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {Cause.failures(v).pipe(
                            Chunk.head,
                            Option.getOrThrow,

                            Match.value,
                            Match.tag("RequestError", () => <Text>HTTP request error</Text>),
                            Match.tag("ResponseError", () => <Text>HTTP response error</Text>),
                            Match.exhaustive,
                        )}
                    </AlertDialog.Description>

                    <Flex gap="3" mt="4" justify="end">
                        <Button variant="solid" color="red" onClick={next}>
                            Ok
                        </Button>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        ),

        onNone: () => <></>,
    })
}
