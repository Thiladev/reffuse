import { GlobalContext } from "@/reffuse"
import { Reffuse, ReffuseContext } from "reffuse"
import { TodosState } from "./services"


export const TodosContext = ReffuseContext.make<TodosState.TodosState>()
export const R = Reffuse.make(GlobalContext, TodosContext)
