import { Array, Option, Predicate, Schema } from "effect"


export type Key = string | number | symbol
export type Path = readonly Key[]

export type Paths<T> = [] | (T extends object
    ? {
        [K in keyof T as K extends string | number | symbol ? K : never]:
            | [K]
            | [K, ...Paths<T[K]>]
    } extends infer O
        ? O[keyof O]
        : never
    : never)

export type ValueFromPath<T, P extends any[]> = P extends [infer Head, ...infer Tail]
    ? Head extends keyof T
        ? ValueFromPath<T[Head], Tail>
        : T extends readonly any[]
            ? Head extends number
                ? ValueFromPath<T[number], Tail>
                : never
            : never
    : T


export const unsafeGet = <T, const P extends Paths<T>>(parent: T, path: P): ValueFromPath<T, P> => (
    path.reduce((acc: any, key: any) => acc?.[key], parent)
)

export const get = <T, const P extends Paths<T>>(parent: T, path: P): Option.Option<ValueFromPath<T, P>> => path.reduce(
    (acc: Option.Option<any>, key: any): Option.Option<any> => Option.isSome(acc)
        ? Predicate.hasProperty(acc.value, key)
            ? Option.some(acc.value[key])
            : Option.none()
        : acc,

    Option.some(parent),
)


export const immutableSet = <T, const P extends Paths<T>>(
    parent: T,
    path: P,
    value: ValueFromPath<T, P>,
): Option.Option<T> => {
    const key = Array.head(path as Path)
    if (Option.isNone(key))
        return Option.some(value as T)
    if (!Predicate.hasProperty(parent, key.value))
        return Option.none()

    const child = immutableSet<any, any>(parent[key.value], Option.getOrThrow(Array.tail(path as Path)), value)
    if (Option.isNone(child))
        return child

    if (Array.isArray(parent))
        return typeof key.value === "number"
            ? Option.some([
                ...parent.slice(0, key.value),
                child.value,
                ...parent.slice(key.value + 1),
            ] as T)
            : Option.none()

    if (typeof parent === "object")
        return Option.some(
            Object.assign(
                Object.create(Object.getPrototypeOf(parent)),
                { ...parent, [key.value]: child.value },
            )
        )

    return Option.none()
}


class Person extends Schema.Class<Person>("Person")({
    name: Schema.String,
}) {}

const persons = [
    Person.make({ name: "Monsieur Poulet" }),
    Person.make({ name: "El Chanclador" }),
    Person.make({ name: "AAAYAYAYAYAAY" }),
]

const res = get(persons, [1, "name"])
const persons2 = Option.getOrThrow(immutableSet(persons, [1, "name"], "El Risitas"))
console.log(persons2)
console.log(get(persons2, [1, "name"]))
