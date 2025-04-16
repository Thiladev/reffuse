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
    readonly elements: { [K in keyof S]: FormTree.FormTree<S["elements"][K]> }
}

export interface Tuple2FormField<S extends Schema.Tuple2<Schema.Schema.Any, Schema.Schema.Any>> extends FormField<S> {
    readonly _tag: "Tuple2FormField"
    // readonly elements: readonly [FormTree.FormTree<S["elements"][0]>, FormTree.FormTree<S["elements"][0]>]
    readonly elements: [...{ [K in keyof S["elements"]]: S["elements"][K] }]
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
