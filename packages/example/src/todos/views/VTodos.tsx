import { Box, Flex } from "@radix-ui/themes"
import { Chunk, Effect } from "effect"
import { R } from "../reffuse"
import { TodosState } from "../services"
import { VNewTodo } from "./VNewTodo"
import { VTodo } from "./VTodo"


export function VTodos() {

    const todosRef = R.useMemo(() => TodosState.TodosState.pipe(Effect.map(state => state.todos)), [])
    const [todos] = R.useSubscribeRefs(todosRef)


    return (
        <Flex direction="column" align="center" gap="3">
            <Box width="500px">
                <VNewTodo />
            </Box>

            {Chunk.map(todos, (todo, index) => (
                <Box key={todo.id} width="500px">
                    <VTodo index={index} todo={todo} />
                </Box>
            ))}
        </Flex>
    )

}
