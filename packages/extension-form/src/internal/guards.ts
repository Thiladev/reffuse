import { Array, Predicate, Record, Schema } from "effect"


export const isStruct = (u: unknown): u is Schema.Struct<any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "fields") && Predicate.isObject(u.fields) &&
    Predicate.hasProperty(u, "record") && Array.isArray(u.record) && Array.isEmptyArray(u.record)
)

export const isRecord = (u: unknown): u is Schema.Record$<any, any> => (
    Schema.isSchema(u) &&
    Predicate.hasProperty(u, "fields") && Predicate.isObject(u.fields) && Record.isEmptyRecord(u.fields) &&
    Predicate.hasProperty(u, "record") && Array.isArray(u.record)
)
