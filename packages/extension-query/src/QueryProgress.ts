import * as AsyncData from "@typed/async-data"
import { Effect, flow, Layer, Match, Option } from "effect"
import * as QueryState from "./QueryState.js"


export class QueryProgress extends Effect.Tag("@reffuse/extension-query/QueryProgress")<QueryProgress, {
    readonly get: Effect.Effect<Option.Option<AsyncData.Progress>, never, QueryState.QueryState<unknown, unknown>>

    readonly update: (
        f: (previous: Option.Option<AsyncData.Progress>) => AsyncData.Progress
    ) => Effect.Effect<void, never, QueryState.QueryState<unknown, unknown>>
}>() {
    static readonly Live = Layer.sync(this, () => {
        const queryStateTag = QueryState.makeTag()

        const get = queryStateTag.pipe(
            Effect.flatMap(state => state.get),
            Effect.map(flow(Match.value,
                Match.tag("Loading", v => v.progress),
                Match.tag("Refreshing", v => v.progress),
                Match.orElse(() => Option.none()),
            )),
        )

        const update = (f: (previous: Option.Option<AsyncData.Progress>) => AsyncData.Progress) => get.pipe(
            Effect.map(f),
            Effect.flatMap(progress => queryStateTag.pipe(
                Effect.flatMap(queryState => queryState.update(previous =>
                    AsyncData.updateProgress(previous, progress)
                ))
            )),
        )

        return { get, update }
    })
}
