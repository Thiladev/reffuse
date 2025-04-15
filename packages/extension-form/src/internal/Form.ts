import { Schema } from "effect"


export interface Form<A, I, R> {
    readonly schema: Schema.Schema<A, I, R>
}


export type FormTree<S extends Schema.Schema<any>> = (
    S extends Schema.Array$<any> ? ArrayFormField<S> :
    S extends Schema.Struct<any> ? StructFormField<S> :
    GenericFormField<S>
)


export interface GenericFormField<S extends Schema.Schema<any>> {
    readonly _tag: "GenericFormField"
    readonly schema: S
    readonly value: S["Type"]
}

export interface ArrayFormField<S extends Schema.Array$<any>> {
    readonly _tag: "ArrayFormField"
    readonly schema: S
    readonly elements: readonly FormTree<S["value"]>[]
}

export interface StructFormField<S extends Schema.Struct<any>> {
    readonly _tag: "StructFormField"
    readonly schema: S
    readonly fields: { [K in keyof S["fields"]]: FormTree<S["fields"][K]> }
}


const MySchema = Schema.Struct({
    name: Schema.String,
    symbol: Schema.SymbolFromSelf,
    values: Schema.Array(Schema.String),
})

type TestFormTree = FormTree<typeof MySchema>
declare const testFormTree: TestFormTree

testFormTree.fields.values.elements
