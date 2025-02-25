export interface ReffuseExtension<A extends object> {
    (): A
    readonly Type: A
}

export const make = <A extends object>(extension: () => A): ReffuseExtension<A> =>
    extension as ReffuseExtension<A>
