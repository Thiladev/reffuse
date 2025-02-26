import { Todo } from "@/domain"
import { Box, Button, Card, Flex, TextArea } from "@radix-ui/themes"
import { Effect, Option, SubscriptionRef } from "effect"
import { R } from "../reffuse"
import { TodosState } from "../services"


const createEmptyTodo = Todo.generateUniqueID.pipe(
    Effect.map(id => Todo.Todo.make({
        id,
        content: "",
        completedAt: Option.none(),
    }, true))
)


export function VNewTodo() {

    const runSync = R.useRunSync()

    const todoRef = R.useMemo(() => createEmptyTodo.pipe(Effect.flatMap(SubscriptionRef.make)), [])
    const [todo, setTodo] = R.useRefState(todoRef)


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="2">
                    <TextArea
                        value={todo.content}
                        onChange={e => setTodo(prev =>
                            Todo.Todo.make({ ...prev, content: e.target.value }, true)
                        )}
                    />

                    <Flex direction="row" justify="center" align="center">
                        <Button
                            onClick={() => TodosState.TodosState.pipe(
                                Effect.flatMap(state => state.prepend(todo)),
                                Effect.andThen(createEmptyTodo),
                                Effect.map(setTodo),
                                runSync,
                            )}
                        >
                            Add
                        </Button>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
