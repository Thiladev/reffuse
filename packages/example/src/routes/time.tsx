import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { DateTime, Ref, Schedule, Stream } from "effect"


const timeEverySecond = Stream.repeatEffectWithSchedule(
    DateTime.now,
    Schedule.intersect(Schedule.forever, Schedule.spaced("1 second")),
)


export const Route = createFileRoute("/time")({
    component: Time
})

function Time() {

    const timeRef = R.useRefFromEffect(DateTime.now)
    R.useFork(Stream.runForEach(timeEverySecond, v => Ref.set(timeRef, v)), [timeRef])
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
