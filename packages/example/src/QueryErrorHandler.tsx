import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes"
import { QueryErrorHandler } from "@reffuse/extension-query"
import { Cause, Console, Context, Effect, Either, flow, Match, Option, Stream } from "effect"
import { useState } from "react"
import { AppQueryErrorHandler } from "./query"
import { R } from "./reffuse"


export function VQueryErrorHandler() {
    const [failure, setFailure] = useState(Option.none<Cause.Cause<
        QueryErrorHandler.Error<Context.Tag.Service<AppQueryErrorHandler>>
    >>())

    R.useFork(() => AppQueryErrorHandler.pipe(Effect.flatMap(handler =>
        Stream.runForEach(handler.errors, v => Console.error(v).pipe(
            Effect.andThen(Effect.sync(() => { setFailure(Option.some(v)) }))
        ))
    )), [])

    return Option.match(failure, {
        onSome: v => (
            <AlertDialog.Root open>
                <AlertDialog.Content maxWidth="450px">
                    <AlertDialog.Title>Error</AlertDialog.Title>
                    <AlertDialog.Description size="2">
                        {Either.match(Cause.failureOrCause(v), {
                            onLeft: flow(
                                Match.value,
                                Match.tag("RequestError", () => <Text>HTTP request error</Text>),
                                Match.tag("ResponseError", () => <Text>HTTP response error</Text>),
                                Match.exhaustive,
                            ),

                            onRight: flow(
                                Cause.dieOption,
                                Option.match({
                                    onSome: () => <Text>Unrecoverable defect</Text>,
                                    onNone: () => <Text>Unknown error</Text>,
                                }),
                            ),
                        })}
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
