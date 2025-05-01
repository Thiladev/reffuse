import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Effect, Ref } from "effect"


export const Route = createFileRoute("/count")({
    component: Count
})

function Count() {

    const runSync = R.useRunSync()

    const countRef = R.useRef(() => Effect.succeed(0))
    const [count] = R.useRefState(countRef)


    return (
        <div className="container mx-auto">
            {/* <button onClick={() => setCount((count) => count + 1)}> */}
            <button onClick={() => Ref.update(countRef, count => count + 1).pipe(runSync)}>
                count is {count}
            </button>
        </div>
    )

}
