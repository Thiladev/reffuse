import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Console, DateTime, Effect, Ref, Schedule, Stream } from "effect"


const timeEverySecond = Stream.repeatEffectWithSchedule(
    DateTime.now,
    Schedule.intersect(Schedule.forever, Schedule.spaced("1 second")),
)


export const Route = createFileRoute("/time")({
    component: Time
})

function Time() {

    const timeRef = R.useRefFromEffect(DateTime.now)

    R.useFork(Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
        Effect.flatMap(() =>
            Stream.runForEach(timeEverySecond, v => Ref.set(timeRef, v))
        )
    ), [timeRef])
    // Reffuse.useFork(Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
    //     Effect.flatMap(() => DateTime.now),
    //     Effect.flatMap(v => Ref.set(timeRef, v)),
    //     Effect.repeat(Schedule.intersect(
    //         Schedule.forever,
    //         Schedule.spaced("1 second"),
    //     )),
    // ), [timeRef])

    const [time] = R.useRefState(timeRef)


    return (
        <div className="container mx-auto">
            <p className="text-center">
                {DateTime.format(time, {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                })}
            </p>
        </div>
    )

}
