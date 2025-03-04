import { HttpClient, HttpClientError } from "@effect/platform"
import { QueryService } from "@reffuse/extension-query"
import { Console, Effect, ParseResult, Schema } from "effect"


export const Result = Schema.Tuple(Schema.String)

export class Uuid4Query extends QueryService.Tag("Uuid4Query")<Uuid4Query,
    typeof Result.Type,
    HttpClientError.HttpClientError | ParseResult.ParseError
>() {}

export const Uuid4QueryLive = QueryService.layer(Uuid4Query, Console.log("Querying...").pipe(
    Effect.andThen(Effect.sleep("500 millis")),
    Effect.andThen(HttpClient.get("https://www.uuidtools.com/api/generate/v4")),
    HttpClient.withTracerPropagation(false),
    Effect.flatMap(res => res.json),
    Effect.flatMap(Schema.decodeUnknown(Result)),
    Effect.scoped,
))
