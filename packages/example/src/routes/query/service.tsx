import { QueryContext } from "@/query/reffuse"
import { Uuid4Query } from "@/query/services"
import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Effect, Layer } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/query/service")({
    component: RouteComponent
})

function RouteComponent() {
    const context = R.useContext()

    const layer = useMemo(() => Layer.empty.pipe(
        Layer.provideMerge(Uuid4Query.Uuid4QueryLive),
        Layer.provide(context)
    ), [])

    return (
        <QueryContext.Provider layer={layer}>

        </QueryContext.Provider>
    )
}
