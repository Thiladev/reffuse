import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Stream } from "effect"


export const Route = createFileRoute("/streams/pull")({
    component: RouteComponent,
})

function RouteComponent() {
    const stream = R.useMemo(() => Stream.)

    return <div>Hello "/streams/pull"!</div>
}
