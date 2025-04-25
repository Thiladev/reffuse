import { Array, Option, Predicate } from "effect"


export type Paths<T> = [] | (
    T extends readonly any[] ? ArrayPaths<T> :
    T extends object ? ObjectPaths<T> :
    never
)

export type ArrayPaths<T extends readonly any[]> = {
    [K in keyof T as K extends number ? K : never]:
        | [K]
        | [K, ...Paths<T[K]>]
} extends infer O
    ? O[keyof O]
    : never

export type ObjectPaths<T extends object> = {
    [K in keyof T as K extends string | number | symbol ? K : never]:
        | [K]
        | [K, ...Paths<T[K]>]
} extends infer O
    ? O[keyof O]
    : never

export type ValueFromPath<T, P extends any[]> = P extends [infer Head, ...infer Tail]
    ? Head extends keyof T
        ? ValueFromPath<T[Head], Tail>
        : T extends readonly any[]
            ? Head extends number
                ? ValueFromPath<T[number], Tail>
                : never
            : never
    : T

export type AnyKey = string | number | symbol
export type AnyPath = readonly AnyKey[]


export const unsafeGet = <T, const P extends Paths<T>>(
    parent: T,
    path: P,
): ValueFromPath<T, P> => (
    path.reduce((acc: any, key: any) => acc?.[key], parent)
)

export const get = <T, const P extends Paths<T>>(
    parent: T,
    path: P,
): Option.Option<ValueFromPath<T, P>> => path.reduce(
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
    const key = Array.head(path as AnyPath)
    if (Option.isNone(key))
        return Option.some(value as T)
    if (!Predicate.hasProperty(parent, key.value))
        return Option.none()

    const child = immutableSet<any, any>(parent[key.value], Option.getOrThrow(Array.tail(path as AnyPath)), value)
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
