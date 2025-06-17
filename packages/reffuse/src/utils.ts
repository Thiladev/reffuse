/**
 * Extracts the common keys between two types
 */
export type CommonKeys<A, B> = Extract<keyof A, keyof B>

/**
 * Obtain the static members type of a constructor function type
 */
export type StaticType<T extends abstract new (...args: any) => any> = Omit<T, "prototype">

export type Merge<Super, Self> = Omit<Super, CommonKeys<Self, Super>> & Self
