/**
 * Extracts the common keys between two types
 */
export type CommonKeys<A, B> = Extract<keyof A, keyof B>

/**
 * Obtain the static members type of a constructor function type
 */
export type StaticType<T extends abstract new (...args: any) => any> = Omit<T, "prototype">

export type Merge<Super, Self> = Omit<Super, CommonKeys<Self, Super>> & Self

export type Includes<T extends readonly any[], U> = (
    T extends [infer Head, ...infer Tail]
        ? (<X>() => X extends Head ? 1 : 2) extends (<X>() => X extends U ? 1 : 2)
            ? true
            : Includes<Tail, U>
        : false
)
