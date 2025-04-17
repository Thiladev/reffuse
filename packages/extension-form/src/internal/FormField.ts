import type { Schema } from "effect"
import type * as FormTree from "./FormTree.ts"


export interface FormField<S extends Schema.Schema.Any> {
    readonly schema: S
}

export interface GenericFormField<S extends Schema.Schema.Any> extends FormField<S> {
    readonly _tag: "GenericFormField"
    readonly value: S["Type"]
}

export interface TupleFormField<
    S extends Schema.TupleType<Elements, Rest>,
    Elements extends Schema.TupleType.Elements,
    Rest extends Schema.TupleType.Rest,
> extends FormField<S> {
    readonly _tag: "TupleFormField"
    readonly elements: [...{ readonly [K in keyof Elements]: FormTree.FormTree<Elements[K]> }]
}

export interface ArrayFormField<
    S extends Schema.Array$<Value>,
    Value extends Schema.Schema.Any,
> extends FormField<S> {
    readonly _tag: "ArrayFormField"
    readonly elements: readonly FormTree.FormTree<Value>[]
}

export interface StructFormField<
    S extends Schema.Struct<Fields>,
    Fields extends Schema.Struct.Fields,
> extends FormField<S> {
    readonly _tag: "StructFormField"
    readonly fields: { readonly [K in keyof Fields]: FormTree.FormTree<Fields[K]> }
}
