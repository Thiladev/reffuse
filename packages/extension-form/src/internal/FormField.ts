import type { Array, Schema, SchemaAST } from "effect"
import type * as Formify from "./Formify.js"


export interface FormField<S extends Schema.Schema.Any> {
    readonly schema: S
}

export interface LiteralFormField<
    S extends Schema.Literal<Literals>,
    Literals extends Array.NonEmptyReadonlyArray<SchemaAST.LiteralValue>,
> extends FormField<S> {
    readonly value: S["Type"]
}

export interface UnionFormField<
    S extends Schema.Union<Members>,
    Members extends ReadonlyArray<Schema.Schema.All>,
> extends FormField<S> {
    readonly member: Formify.Formify<Members[number]>
}

export interface TupleFormField<
    S extends Schema.TupleType<Elements, Rest>,
    Elements extends Schema.TupleType.Elements,
    Rest extends Schema.TupleType.Rest,
> extends FormField<S> {
    readonly elements: [...{ readonly [K in keyof Elements]: Formify.Formify<Elements[K]> }]
}

export interface ArrayFormField<
    S extends Schema.Array$<Value>,
    Value extends Schema.Schema.Any,
> extends FormField<S> {
    readonly elements: readonly Formify.Formify<Value>[]
}

export interface StructFormField<
    S extends Schema.Struct<Fields>,
    Fields extends Schema.Struct.Fields,
> extends FormField<S> {
    readonly fields: { readonly [K in keyof Fields]: Formify.Formify<Fields[K]> }
}

export interface GenericFormField<S extends Schema.Schema.Any> extends FormField<S> {
    readonly value: S["Type"]
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
    readonly propertySignature: S
    readonly value: Type
}
