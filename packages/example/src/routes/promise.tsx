import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect } from "effect"
import { use, useMemo } from "react"


export const Route = createFileRoute("/promise")({
    component: RouteComponent
})

function RouteComponent() {

    const runPromise = R.useRunPromise()

    const promise = useMemo(() => HttpClient.HttpClient.pipe(
        Effect.flatMap(client => client.get("https://www.uuidtools.com/api/generate/v4")),
        HttpClient.withTracerPropagation(false),
        Effect.flatMap(res => res.json),
        Effect.tap(Console.log),

        Effect.scoped,
        runPromise,
    ), [runPromise])

    const value = use(promise)


    return <div>Hello "/tests"!</div>

}
