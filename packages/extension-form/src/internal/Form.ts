import { Schema, SubscriptionRef } from "effect"


export interface Form<A, I, R> {
    readonly schema: Schema.Schema<A, I, R>
}


export type FormTree<S extends Schema.Schema<any>> = (
    S extends Schema.Struct<any> ? StructFormField<S> :
    S extends ScalarSchema ? ScalarFormField<S> :
    S["Type"]
)


export interface FormField<S extends Schema.Schema<any>> {
    readonly value: SubscriptionRef.SubscriptionRef<S["Type"]>
}

export interface ScalarFormField<S extends ScalarSchema> extends FormField<S> {
    readonly _tag: "ScalarFormField"
    readonly schema: S
}

export interface StructFormField<S extends Schema.Struct<any>> extends FormField<S> {
    readonly _tag: "StructFormField"
    readonly schema: S
    readonly fields: { [K in keyof S["fields"]]: FormTree<S["fields"][K]> }
}


export type ScalarSchema = (
    | Schema.String
    | Schema.Number
)


const MySchema = Schema.Struct({
    name: Schema.String,
    values: Schema.Array(Schema.String),
})

type TestFormTree = FormTree<typeof MySchema>
declare const testFormTree: TestFormTree

testFormTree.fields.name.value
