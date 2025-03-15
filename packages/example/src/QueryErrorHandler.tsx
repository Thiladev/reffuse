import { HttpClientError } from "@effect/platform"
import { ErrorHandler } from "@reffuse/extension-query"
import { Cause, Chunk, Effect, flow, Match, Stream } from "effect"
import { R } from "./reffuse"


export class QueryErrorHandler extends ErrorHandler.Tag("QueryErrorHandler")<QueryErrorHandler,
    HttpClientError.HttpClientError
>() {}

export const QueryErrorHandlerLive = ErrorHandler.layer(QueryErrorHandler)


export function VQueryErrorHandler() {
    R.useFork(() => QueryErrorHandler.pipe(Effect.flatMap(handler =>
        Stream.runForEach(handler.errors, flow(
            Cause.failures,
            Chunk.map(flow(Match.value,
                Match.tag("RequestError", () => Effect.sync(() => {})),
                Match.tag("ResponseError", () => Effect.sync(() => {})),
                Match.exhaustive,
            )),
            Effect.all,
        ))
    )), [])
}
