import { QueryContext } from "@/query/reffuse"
import { Uuid4Query } from "@/query/services"
import { Uuid4QueryService } from "@/query/views/Uuid4QueryService"
import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Schema } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/query/service")({
    component: RouteComponent
})

function RouteComponent() {
    // const context = R.useLayer()

    // const layer = useMemo(() => Layer.empty.pipe(
    //     Layer.provideMerge(Uuid4Query.Uuid4QueryLive),
    //     Layer.provide(context),
    // ), [context])

    const query = R.useQuery({
        key: R.useStreamFromValues(["uuid4", 10]),
        query: ([, count]) => Console.log(`Querying ${ count } IDs...`).pipe(
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.andThen(HttpClient.get(`https://www.uuidtools.com/api/generate/v4/count/${ count }`)),
            HttpClient.withTracerPropagation(false),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Uuid4Query.Result)),
            Effect.scoped,
        ),
    })

    const layer = useMemo(() => query.layer(Uuid4Query.Uuid4Query), [query])

    return (
        <QueryContext.Provider layer={layer}>
            <Uuid4QueryService />
        </QueryContext.Provider>
    )
}
