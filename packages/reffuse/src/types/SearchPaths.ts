import { Option, Predicate } from "effect"


export type Paths<T> = T extends object
    ? {
        [K in keyof T as K extends string | number | symbol ? K : never]:
            | [K]
            | [K, ...Paths<T[K]>]
    } extends infer O
        ? O[keyof O]
        : never
    : []

type ValueFromPath<T, P extends any[]> = P extends [infer Head, ...infer Tail]
    ? Head extends keyof T
        ? ValueFromPath<T[Head], Tail>
        : T extends readonly any[]
            ? Head extends number
                ? ValueFromPath<T[number], Tail>
                : never
            : never
    : T


const persons = [
    { name: "Monsieur Poulet" },
    { name: "El Chanclador" },
    { name: "AAAYAYAYAYAAY" },
]


export const get = <T, const P extends Paths<T>>(parent: T, path: P): Option.Option<ValueFromPath<T, P>> => path.reduce(
    (acc: Option.Option<any>, key: any): Option.Option<any> => Option.isSome(acc)
        ? Predicate.hasProperty(acc.value, key)
            ? Option.some(acc.value[key])
            : Option.none()
        : acc,

    Option.some(parent),
)

export const getOrUndefined = <T, const P extends Paths<T>>(parent: T, path: P): ValueFromPath<T, P> => (
    path.reduce((acc: any, key: any) => acc?.[key], parent)
)

const res = get(persons, [1, "name"])
console.log(res)
