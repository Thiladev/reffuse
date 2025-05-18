import { Todo } from "@/domain"
import { Box, Button, Card, Flex, TextArea } from "@radix-ui/themes"
import { Effect, Option, Ref } from "effect"
import { R } from "../reffuse"
import { TodosState } from "../services"


const createEmptyTodo = Effect.map(Todo.generateUniqueID, id => Todo.Todo.make({
    id,
    content: "",
    completedAt: Option.none(),
}, true))


export function VNewTodo() {

    const todoRef = R.useRef(() => createEmptyTodo)
    const [content, setContent] = R.useRefState(R.useSubRef(todoRef, ["content"]))

    const add = R.useCallbackSync(() => Effect.all([TodosState.TodosState, todoRef]).pipe(
        Effect.flatMap(([state, todo]) => state.prepend(todo)),
        Effect.andThen(createEmptyTodo),
        Effect.flatMap(v => Ref.set(todoRef, v)),
    ), [todoRef])


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="2">
                    <TextArea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />

                    <Flex direction="row" justify="center" align="center">
                        <Button onClick={add}>Add</Button>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
