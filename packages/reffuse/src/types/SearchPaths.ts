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


const getFromPath = <T, const P extends Paths<T>>(value: T, path: P): ValueFromPath<T, P> => (
    path.reduce((acc: any, key: any) => acc?.[key], value)
)

const res = getFromPath(persons, [1, "name"])
console.log(res)
