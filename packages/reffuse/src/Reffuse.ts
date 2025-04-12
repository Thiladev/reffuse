import type * as ReffuseContext from "./ReffuseContext.js"
import type * as ReffuseExtension from "./ReffuseExtension.js"
import * as ReffuseNamespace from "./ReffuseNamespace.js"
import type { Merge, StaticType } from "./types.js"


export class Reffuse extends ReffuseNamespace.makeClass() {}


export const withContexts = <R2 extends Array<unknown>>(
    ...contexts: [...{ [K in keyof R2]: ReffuseContext.ReffuseContext<R2[K]> }]
) => (
    <
        BaseClass extends ReffuseNamespace.ReffuseNamespaceClass<R1>,
        R1
    >(
        self: BaseClass & ReffuseNamespace.ReffuseNamespaceClass<R1>
    ): (
        {
            new(): Merge<
                InstanceType<BaseClass>,
                { constructor: ReffuseNamespace.ReffuseNamespaceClass<R1 | R2[number]> }
            >
        } &
        Merge<
            StaticType<BaseClass>,
            StaticType<ReffuseNamespace.ReffuseNamespaceClass<R1 | R2[number]>>
        >
    ) => class extends self {
        static readonly contexts = [...self.contexts, ...contexts]
    } as any
)

export const withExtension = <A extends object>(extension: ReffuseExtension.ReffuseExtension<A>) => (
    <
        BaseClass extends ReffuseNamespace.ReffuseNamespaceClass<R>,
        R
    >(
        self: BaseClass & ReffuseNamespace.ReffuseNamespaceClass<R>
    ): (
        { new(): Merge<InstanceType<BaseClass>, A> } &
        StaticType<BaseClass>
    ) => {
        const class_ = class extends self {}
        Object.assign(class_.prototype, extension())
        return class_ as any
    }
)
