import type { Schema } from "effect"
import type * as Form from "./Form.ts"


export interface FormField<S extends Schema.Schema.Any> {

}

export interface GenericFormField<S extends Schema.Schema.Any> extends FormField<S> {
    readonly _tag: "GenericFormField"
    readonly schema: S
    readonly value: S["Type"]
}

export interface ArrayFormField<S extends Schema.Array$<Schema.Schema.Any>> extends FormField<S> {
    readonly _tag: "ArrayFormField"
    readonly schema: S
    readonly elements: readonly Form.FormTree<S["value"]>[]
}

export interface StructFormField<S extends Schema.Struct<Schema.Struct.Fields>> extends FormField<S> {
    readonly _tag: "StructFormField"
    readonly schema: S
    readonly fields: { [K in keyof S["fields"]]: Form.FormTree<S["fields"][K]> }
}
