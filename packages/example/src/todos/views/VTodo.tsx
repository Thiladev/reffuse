import { Todo } from "@/domain"
import { Box, Card, Flex, IconButton, TextArea } from "@radix-ui/themes"
import { Effect, Ref, SubscriptionRef } from "effect"
import { Delete } from "lucide-react"
import { useState } from "react"
import { R } from "../reffuse"


export interface VTodoProps {
    readonly todoRef: SubscriptionRef.SubscriptionRef<Todo.Todo>
    readonly remove: Effect.Effect<void>
}

export function VTodo({ todoRef, remove }: VTodoProps) {

    const runSync = R.useRunSync()
    const [todo] = R.useSubscribeRefs(todoRef)
    const editorMode = useState(false)


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="1">
                    <TextArea
                        value={todo.content}
                        onChange={e => runSync(
                            Ref.set(todoRef, Todo.Todo.make({
                                ...todo,
                                content: e.target.value,
                            }, true))
                        )}
                        disabled={!editorMode}
                    />

                    <Flex direction="row" justify="between" align="center">
                        <Box></Box>

                        <Flex direction="row" align="center" gap="1">
                            <IconButton onClick={() => runSync(remove)}>
                                <Delete />
                            </IconButton>
                        </Flex>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
