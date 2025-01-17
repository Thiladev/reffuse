import { ThSchema } from "@thilawyn/thilaschema"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Effect, Schema } from "effect"


export class Todo extends Schema.Class<Todo>("Todo")({
    _tag: Schema.tag("Todo"),
    id: Schema.String,
    content: Schema.String,
    completedAt: Schema.OptionFromSelf(Schema.DateTimeUtcFromSelf),
}) {}


export const TodoFromJsonStruct = Schema.Struct({
    ...Todo.fields,
    completedAt: Schema.Option(Schema.DateTimeUtc),
}).pipe(
    ThSchema.assertEncodedJsonifiable
)

export const TodoFromJson = TodoFromJsonStruct.pipe(Schema.compose(Todo))


export const generateUniqueID = makeUuid4.pipe(
    Effect.provide(GetRandomValues.CryptoRandom)
)
