import { HttpClientError } from "@effect/platform"
import { QueryService } from "@reffuse/extension-query"
import { ParseResult, Schema } from "effect"


export const Result = Schema.Array(Schema.String)

export class Uuid4Query extends QueryService.Tag("Uuid4Query")<Uuid4Query,
    typeof Result.Type,
    HttpClientError.HttpClientError | ParseResult.ParseError
>() {}
