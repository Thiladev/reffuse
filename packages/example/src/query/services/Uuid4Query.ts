import { QueryService } from "@reffuse/extension-query"
import { ParseResult, Schema } from "effect"


export const Result = Schema.Array(Schema.String)

export class Uuid4Query extends QueryService.Tag("Uuid4Query")<Uuid4Query,
    readonly ["uuid4", number],
    typeof Result.Type,
    ParseResult.ParseError
>() {}
