import { HttpClientError } from "@effect/platform"
import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes"
import { ErrorHandler } from "@reffuse/extension-query"
import { Cause, Chunk, Context, Effect, Match, Option, Stream } from "effect"
import { useState } from "react"
import { R } from "./reffuse"


export class QueryErrorHandler extends ErrorHandler.Tag("QueryErrorHandler")<QueryErrorHandler,
    HttpClientError.HttpClientError
>() {}

export const QueryErrorHandlerLive = ErrorHandler.layer(QueryErrorHandler)


export function VQueryErrorHandler() {
    const [failure, setFailure] = useState(Option.none<Cause.Cause<
        ErrorHandler.Error<Context.Tag.Service<QueryErrorHandler>>
    >>())

    R.useFork(() => QueryErrorHandler.pipe(Effect.flatMap(handler =>
        Stream.runForEach(handler.errors, v => Effect.sync(() =>
            setFailure(Option.some(v))
        ))
    )), [])

    return Option.match(failure, {
        onSome: v => (
            <AlertDialog.Root open>
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
                        <AlertDialog.Action>
                            <Button variant="solid" color="red" onClick={() => setFailure(Option.none())}>
                                Ok
                            </Button>
                        </AlertDialog.Action>
                    </Flex>
                </AlertDialog.Content>
            </AlertDialog.Root>
        ),

        onNone: () => <></>,
    })
}
