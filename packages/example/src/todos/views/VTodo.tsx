import { Todo } from "@/domain"
import { Box, Card, Flex, IconButton, TextArea } from "@radix-ui/themes"
import { Effect } from "effect"
import { Delete } from "lucide-react"
import { useState } from "react"
import { R } from "../reffuse"
import { TodosState } from "../services"


export interface VTodoProps {
    readonly index: number
    readonly todo: Todo.Todo
}

export function VTodo({ index, todo }: VTodoProps) {

    const runSync = R.useRunSync()
    const editorMode = useState(false)


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="1">
                    <TextArea
                        value={todo.content}
                        onChange={e => TodosState.TodosState.pipe(
                            Effect.flatMap(state => state.replace(
                                index,
                                Todo.Todo.make({ ...todo, content: e.target.value }, true),
                            )),
                            runSync,
                        )}
                        disabled={!editorMode}
                    />

                    <Flex direction="row" justify="between" align="center">
                        <Box></Box>

                        <Flex direction="row" align="center" gap="1">
                            <IconButton
                                onClick={() => TodosState.TodosState.pipe(
                                    Effect.flatMap(state => state.remove(index)),
                                    runSync,
                                )}
                            >
                                <Delete />
                            </IconButton>
                        </Flex>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
