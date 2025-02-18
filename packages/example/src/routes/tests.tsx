import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect } from "effect"
import { useEffect, useState } from "react"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    // const value = R.useMemoScoped(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
    //     Effect.andThen(makeUuid4),
    //     Effect.provide(GetRandomValues.CryptoRandom),
    // ), [])
    // console.log(value)

    // R.useFork(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
    //     Effect.andThen(Console.log("ouient")),
    //     Effect.delay("1 second"),
    // ))

    const runPromise = R.useRunPromise()
    const [promise, setPromise] = useState<Promise<void> | null>(null)
    const [, setValue] = useState("")

    useEffect(() => {
        makeUuid4.pipe(
            Effect.provide(GetRandomValues.CryptoRandom),
            Effect.tap(id => Effect.sync(() => setValue(id))),
            Effect.andThen(Console.log),
            Effect.delay("1 second"),

            runPromise,
            setPromise,
        )
    }, [runPromise])

    console.log(promise)


    return <div>Hello "/tests"!</div>
}
