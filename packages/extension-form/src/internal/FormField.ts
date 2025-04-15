import type { Schema } from "effect"
import type * as FormTree from "./FormTree.ts"


export interface FormField<S extends Schema.Schema.Any> {
    readonly schema: S
}

export interface GenericFormField<S extends Schema.Schema.Any> extends FormField<S> {
    readonly _tag: "GenericFormField"
    readonly value: S["Type"]
}

export interface TupleFormField<S extends Schema.Tuple<readonly Schema.Schema.AnyNoContext[]>> extends FormField<S> {
    readonly _tag: "TupleFormField"
    readonly elements: { readonly [K in keyof S["elements"]]: FormTree.FormTree<S["elements"][K]> }
}

export interface ArrayFormField<S extends Schema.Array$<Schema.Schema.AnyNoContext>> extends FormField<S> {
    readonly _tag: "ArrayFormField"
    readonly elements: readonly FormTree.FormTree<S["value"]>[]
}

export interface StructFormField<S extends Schema.Struct<{
    readonly [x: string]: Schema.Schema.AnyNoContext
    readonly [x: number]: Schema.Schema.AnyNoContext
    readonly [x: symbol]: Schema.Schema.AnyNoContext
}>> extends FormField<S> {
    readonly _tag: "StructFormField"
    readonly fields: { [K in keyof S["fields"]]: FormTree.FormTree<S["fields"][K]> }
}
