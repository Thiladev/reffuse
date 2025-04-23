import { Array, Option, Predicate } from "effect"


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

    if (Array.isArray(parent) && typeof key === "number") {

        return Option.some([])
    }
}


const persons = [
    { name: "Monsieur Poulet" },
    { name: "El Chanclador" },
    { name: "AAAYAYAYAYAAY" },
]

const res = get(persons, [1, "name"])
console.log(res)
