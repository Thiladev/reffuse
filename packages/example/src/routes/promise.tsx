import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect } from "effect"
import { Suspense, use, useEffect, useMemo } from "react"


export const Route = createFileRoute("/promise")({
    component: RouteComponent
})

function RouteComponent() {
    return (
        <Suspense fallback={<Text>Loading...</Text>}>
            <AsyncComponent />
        </Suspense>
    )
}

function AsyncComponent() {

    // const runPromise = R.useRunPromise()

    // const promise = useMemo(() => HttpClient.HttpClient.pipe(
    //     Effect.flatMap(client => client.get("https://www.uuidtools.com/api/generate/v4")),
    //     HttpClient.withTracerPropagation(false),
    //     Effect.flatMap(res => res.json),
    //     Effect.tap(Console.log),

    //     Effect.scoped,
    //     runPromise,
    // ), [runPromise])

    const promise = useMemo(() => new Promise<string>((resolve => {
        setTimeout(() => { resolve("prout") }, 500)
    })), [])

    console.log("React.use invoked with:", promise);
    const value = use(promise)


    return <div>Hello "/tests"!</div>

}
