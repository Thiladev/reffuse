import { GlobalReffuse } from "@/reffuse"
import { Reffuse, ReffuseContext } from "reffuse"
import { TodosState } from "./services"


export const TodosContext = ReffuseContext.make<TodosState.TodosState>()

export const R = new class TodosReffuse extends GlobalReffuse.pipe(
    Reffuse.withContexts(TodosContext)
) {}
