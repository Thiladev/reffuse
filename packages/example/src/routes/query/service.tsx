import { QueryContext } from "@/query/reffuse"
import { Uuid4Query } from "@/query/services"
import { Uuid4QueryService } from "@/query/views/Uuid4QueryService"
import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Layer } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/query/service")({
    component: RouteComponent
})

function RouteComponent() {
    const context = R.useLayer()

    const layer = useMemo(() => Layer.empty.pipe(
        Layer.provideMerge(Uuid4Query.Uuid4QueryLive),
        Layer.provide(context),
    ), [context])

    return (
        <QueryContext.Provider layer={layer}>
            <Uuid4QueryService />
        </QueryContext.Provider>
    )
}
