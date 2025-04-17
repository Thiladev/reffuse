import { Schema } from "effect"
import type * as FormField from "./FormField.js"


export type FormTree<S> = (
    S extends Schema.TupleType<infer Elements, infer Rest> ? FormField.TupleFormField<S, Elements, Rest> :
    S extends Schema.Array$<infer Value> ? FormField.ArrayFormField<S, Value> :
    S extends Schema.Struct<infer Fields> ? FormField.StructFormField<S, Fields> :
    S extends Schema.Schema.Any ? FormField.GenericFormField<S> :
    never
)


const User = Schema.Struct({
    name: Schema.String,
    roles: Schema.Tuple(Schema.Literal("Admin"), Schema.Literal("Moderator"), Schema.Literal("User")),
    values: Schema.Array(Schema.String),
})

type TestFormTree = FormTree<typeof User>
declare const testFormTree: TestFormTree

testFormTree.fields.roles.elements
