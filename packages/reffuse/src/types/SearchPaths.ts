type SearchPathsV1<T> = T extends object
    ? {
        [K in keyof T]: [K] | [K, ...SearchPathsV1<T[K]>]
    }[keyof T]
    : []

type SearchPathsV2<T> = T extends object
    ? {
        [K in keyof T as K extends string | number | symbol ? K : never]:
            | [K]
            | [K, ...SearchPathsV2<T[K]>]
    } extends infer O
        ? O[keyof O]
        : never
    : []

type Get<T, P extends any[]> =
  P extends [infer Head, ...infer Tail]
    ? Head extends keyof T
      ? Get<T[Head], Tail>
      : T extends readonly any[]
        ? Head extends number
          ? Get<T[number], Tail>
          : never
        : never
    : T;


type Persons = {
    name: string;
}[]

type V = SearchPathsV2<[string, number]>


function getFromSearchPath<T, const P extends SearchPathsV2<T>>(obj: T, path: P): Get<T, P> {
    return path.reduce((acc: any, key: any) => acc?.[key], obj);
}

const res = getFromSearchPath([{ name: "prout" }] as const, ["0", "name"])
