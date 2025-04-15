import { Schema } from "effect"
import type * as FormField from "./FormField.js"


export interface Form<A, I, R> {
    readonly schema: Schema.Schema<A, I, R>
}


export type FormTree<S extends Schema.Schema<any>> = (
    S extends Schema.Array$<any> ? FormField.ArrayFormField<S> :
    S extends Schema.Struct<any> ? FormField.StructFormField<S> :
    FormField.GenericFormField<S>
)


const MySchema = Schema.Struct({
    name: Schema.String,
    symbol: Schema.SymbolFromSelf,
    values: Schema.Array(Schema.String),
})

type TestFormTree = FormTree<typeof MySchema>
declare const testFormTree: TestFormTree

testFormTree.fields.values.elements
