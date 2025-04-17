import type { Array, Schema, SchemaAST } from "effect"
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

export interface LiteralFormField<
    S extends Schema.Literal<Literals>,
    Literals extends Array.NonEmptyReadonlyArray<SchemaAST.LiteralValue>,
> extends FormField<S> {
    readonly _tag: "LiteralFormField"
    readonly value: S["Type"]
}

export interface UnionFormField<
    S extends Schema.Union<Members>,
    Members extends ReadonlyArray<Schema.Schema.All>,
> extends FormField<S> {
    readonly _tag: "UnionFormField"
    readonly member: FormTree.FormTree<Members[number]>
}


export interface PropertySignatureFormField<
    S extends Schema.PropertySignature<TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R>,
    TypeToken extends Schema.PropertySignature.Token,
    Type,
    Key extends PropertyKey,
    EncodedToken extends Schema.PropertySignature.Token,
    Encoded,
    HasDefault extends boolean = false,
    R = never,
> {
    readonly _tag: "PropertySignatureFormField"
    readonly propertySignature: S
    readonly value: Type
}
