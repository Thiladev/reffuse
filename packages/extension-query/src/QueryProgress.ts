import * as AsyncData from "@typed/async-data"
import { Effect, flow, Layer, Match, Option } from "effect"
import { QueryState } from "./internal/index.js"


export class QueryProgress extends Effect.Tag("@reffuse/extension-query/QueryProgress")<QueryProgress, {
    readonly get: Effect.Effect<Option.Option<AsyncData.Progress>>

    readonly update: (
        f: (previous: Option.Option<AsyncData.Progress>) => AsyncData.Progress
    ) => Effect.Effect<void>
}>() {
    static readonly Live: Layer.Layer<
        QueryProgress,
        never,
        QueryState.QueryState<any, any>
    > = Layer.effect(this, Effect.gen(function*() {
        const state = yield* QueryState.makeTag()

        const get = state.get.pipe(
            Effect.map(flow(Match.value,
                Match.tag("Loading", v => v.progress),
                Match.tag("Refreshing", v => v.progress),
                Match.orElse(() => Option.none()),
            ))
        )

        const update = (f: (previous: Option.Option<AsyncData.Progress>) => AsyncData.Progress) => get.pipe(
            Effect.map(f),
            Effect.flatMap(progress => state.update(previous =>
                AsyncData.updateProgress(previous, progress)
            )),
        )

        return { get, update }
    }))
}
