import type * as AsyncData from "@typed/async-data"
import { Effect, type Option } from "effect"


export class QueryProgress extends Effect.Tag("@reffuse/extension-query/QueryProgress")<QueryProgress, {
    readonly set: (previous: Option.Option<AsyncData.Progress>) => Effect.Effect<void>
}>() {}
