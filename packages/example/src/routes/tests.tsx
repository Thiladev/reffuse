import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect } from "effect"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    // const value = R.useMemoScoped(Effect.addFinalizer(() => Console.log("cleanup")).pipe(
    //     Effect.andThen(makeUuid4),
    //     Effect.provide(GetRandomValues.CryptoRandom),
    // ), [])
    // console.log(value)

    R.useFork(() => Effect.addFinalizer(() => Console.log("cleanup")).pipe(
        Effect.andThen(Console.log("ouient")),
        Effect.delay("1 second"),
    ))


    return <div>Hello "/tests"!</div>
}
