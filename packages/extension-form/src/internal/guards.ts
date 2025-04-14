import { Array, Predicate, Record, Schema, Tuple } from "effect"


export const isTupleSchema = (u: unknown): u is Schema.Tuple<any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "elements") && Array.isArray(u.elements) &&
    Predicate.hasProperty(u, "rest") && Array.isArray(u.rest)
)

export const isArraySchema = (u: unknown): u is Schema.Array$<any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "elements") && Array.isArray(u.elements) && Array.isEmptyArray(u.elements) &&
    Predicate.hasProperty(u, "rest") && Array.isArray(u.rest) && Tuple.isTupleOf(u.rest, 1) &&
    Predicate.hasProperty(u, "value")
)

export const isStructSchema = (u: unknown): u is Schema.Struct<any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "fields") && Predicate.isObject(u.fields) &&
    Predicate.hasProperty(u, "records") && Array.isArray(u.records) && Array.isEmptyArray(u.records)
)

export const isRecordSchema = (u: unknown): u is Schema.Record$<any, any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "fields") && Predicate.isObject(u.fields) && Record.isEmptyRecord(u.fields) &&
    Predicate.hasProperty(u, "records") && Array.isArray(u.records) &&
    Predicate.hasProperty(u, "key") &&
    Predicate.hasProperty(u, "value")
)


const myTuple = Schema.Tuple(Schema.String)
const myArray = Schema.Array(Schema.String)
const myStruct = Schema.Struct({})
const myRecord = Schema.Record({ key: Schema.String, value: Schema.String })

console.log(isArraySchema(myTuple))
