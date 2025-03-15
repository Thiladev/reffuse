import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes"
import { ErrorHandler } from "@reffuse/extension-query"
import { Cause, Chunk, Context, Effect, Match, Option, Stream } from "effect"
import { useState } from "react"
import { AppQueryErrorHandler } from "./query"
import { R } from "./reffuse"


export function VQueryErrorHandler() {
    const [failure, setFailure] = useState(Option.none<Cause.Cause<
        ErrorHandler.Error<Context.Tag.Service<AppQueryErrorHandler>>
    >>())

    R.useFork(() => AppQueryErrorHandler.pipe(Effect.flatMap(handler =>
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
