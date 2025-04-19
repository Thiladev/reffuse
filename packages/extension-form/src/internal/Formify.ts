import { Schema } from "effect"
import type * as FormField from "./FormField.js"


export type Formify<S> = (
    S extends Schema.Union<infer Members> ? FormField.UnionFormField<S, Members> :
    S extends Schema.TupleType<infer Elements, infer Rest> ? FormField.TupleFormField<S, Elements, Rest> :
    S extends Schema.Array$<infer Value> ? FormField.ArrayFormField<S, Value> :
    S extends Schema.Struct<infer Fields> ? FormField.StructFormField<S, Fields> :
    S extends Schema.Schema.Any ? FormField.GenericFormField<S> :
    S extends Schema.PropertySignature<
        infer TypeToken,
        infer Type,
        infer Key,
        infer EncodedToken,
        infer Encoded,
        infer HasDefault,
        infer R
    > ? FormField.PropertySignatureFormField<S, TypeToken, Type, Key, EncodedToken, Encoded, HasDefault, R> :
    never
)


const Login = Schema.Union(
    Schema.Struct({
        _tag: Schema.tag("ByEmail"),
        email: Schema.String,
        password: Schema.RedactedFromSelf(Schema.String),
    }),

    Schema.Struct({
        _tag: Schema.tag("ByPhone"),
        phone: Schema.String,
        password: Schema.RedactedFromSelf(Schema.String),
    }),

    Schema.TaggedStruct("ByKey", {
        id: Schema.String,
        password: Schema.RedactedFromSelf(Schema.String),
    }),
)
type LoginForm = Formify<typeof Login>
declare const loginForm: LoginForm

switch (loginForm.member._tag) {
    case "ByEmail":
        loginForm.member
    break
    case "ByPhone":
    break
}
