import { Schema } from "effect"
import type * as FormField from "./FormField.js"


export type Formify<S> = (
    S extends Schema.Literal<infer Literals> ? FormField.LiteralFormField<S, Literals> :
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


const LoginForm = Schema.Union(
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
)
type LoginFormTree = Formify<typeof LoginForm>
declare const loginFormTree: LoginFormTree

switch (loginFormTree.member.fields._tag.value) {
    case "ByEmail":
    break
    case "ByPhone":
    break
}


const User = Schema.Struct({
    _tag: Schema.tag("User"),
    name: Schema.String,
    roles: Schema.Tuple(Schema.Literal("Admin"), Schema.Literal("Moderator"), Schema.Literal("User")),
    values: Schema.Array(Schema.String),
})

type TestFormTree = Formify<typeof User>
declare const testFormTree: TestFormTree

testFormTree.fields._tag
testFormTree.fields.roles.elements[0].value
