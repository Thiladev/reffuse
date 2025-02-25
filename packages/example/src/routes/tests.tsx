import { R } from "@/reffuse"
import { Button } from "@radix-ui/themes"
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

    const logValue = R.useCallbackSync(Effect.fn(function*(value: string) {
        yield* Effect.log(value)
    }))


    return (
        <Button onClick={() => logValue("test")}>Log value</Button>
    )
}
