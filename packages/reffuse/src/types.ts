/**
 * Extracts the common keys between two types
 */
export type CommonKeys<A, B> = Extract<keyof A, keyof B>

/**
 * Obtain the static members type of a constructor function type
 */
export type StaticType<T extends abstract new (...args: any) => any> = Omit<T, "prototype">

export type Extend<Super, Self> =
    Extendable<Super, Self> extends true
        ? Omit<Super, CommonKeys<Self, Super>> & Self
        : never

export type Extendable<Super, Self> =
    Pick<Self, CommonKeys<Self, Super>> extends Pick<Super, CommonKeys<Self, Super>>
        ? true
        : false

export type Merge<Super, Self> = Omit<Super, CommonKeys<Self, Super>> & Self
