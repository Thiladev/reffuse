import { R } from "@/reffuse"
import { Flex } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Scope } from "effect"
import { useEffect } from "react"


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    const runSync = R.useRunSync()
    const componentScope = R.useScope()

    useEffect(() => Effect.addFinalizer(() => Console.log("Component scope cleanup!")).pipe(
        Effect.andThen(Console.log("Component mounted")),
        Effect.provideService(Scope.Scope, componentScope),
        runSync,
    ), [componentScope, runSync])

    return (
        <Flex direction="row" justify="center" align="center" gap="2">
        </Flex>
    )
}
