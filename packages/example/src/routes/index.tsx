import { TodosContext } from "@/todos/reffuse"
import { TodosState } from "@/todos/services"
import { VTodos } from "@/todos/views/VTodos"
import { Container } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Layer } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/")({
    component: Index
})

function Index() {

    const todosLayer = useMemo(() => Layer.empty.pipe(
        Layer.provideMerge(TodosState.make("todos"))
    ), [])


    return (
        <Container>
            <TodosContext.Provider layer={todosLayer}>
                <VTodos />
            </TodosContext.Provider>
        </Container>
    )

}
