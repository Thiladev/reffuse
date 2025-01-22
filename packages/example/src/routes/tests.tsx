import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect } from "effect"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    // R.useMemo(Effect.addFinalizer(() => Console.log("Cleanup!")).pipe(
    //     Effect.map(() => "test")
    // ))

    const value = R.useMemoScoped(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
        Effect.andThen(makeUuid4),
        Effect.provide(GetRandomValues.CryptoRandom),
    ), [])
    console.log(value)

    return <div>Hello "/tests"!</div>
}
