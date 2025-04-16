import { Schema } from "effect"
import type * as FormField from "./FormField.js"


export type FormTree<S extends Schema.Schema.Any> = (
    S extends Schema.Tuple<any> ? FormField.TupleFormField<S> :
    S extends Schema.Array$<any> ? FormField.ArrayFormField<S> :
    S extends Schema.Struct<any> ? FormField.StructFormField<S> :
    FormField.GenericFormField<S>
)


const User = Schema.Struct({
    name: Schema.String,
    roles: Schema.Tuple(Schema.Literal("Admin"), Schema.Literal("Moderator"), Schema.Literal("User")),
    values: Schema.Array(Schema.String),
})

type TestFormTree = FormTree<typeof User>
declare const testFormTree: TestFormTree

testFormTree.fields.roles.elements
