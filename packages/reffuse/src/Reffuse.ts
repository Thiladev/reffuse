import type * as ReffuseContext from "./ReffuseContext.js"
import type * as ReffuseExtension from "./ReffuseExtension.js"
import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


export class Reffuse extends ReffuseHelpers.make() {}


export const withContexts = <R2 extends Array<unknown>>(
    ...contexts: [...{ [K in keyof R2]: ReffuseContext.ReffuseContext<R2[K]> }]
) => (
    <
        BaseClass extends ReffuseHelpers.ReffuseHelpersClass<R1>,
        R1
    >(
        self: BaseClass & ReffuseHelpers.ReffuseHelpersClass<R1>
    ): (
        {
            new(): Merge<
                InstanceType<BaseClass>,
                { constructor: ReffuseHelpers.ReffuseHelpersClass<R1 | R2[number]> }
            >
        } &
        Merge<
            StaticType<BaseClass>,
            StaticType<ReffuseHelpers.ReffuseHelpersClass<R1 | R2[number]>>
        >
    ) => class extends self {
        static readonly contexts = [...self.contexts, ...contexts]
    } as any
)

export const withExtension = <A extends object>(extension: ReffuseExtension.ReffuseExtension<A>) => (
    <
        BaseClass extends ReffuseHelpers.ReffuseHelpersClass<R>,
        R
    >(
        self: BaseClass & ReffuseHelpers.ReffuseHelpersClass<R>
    ): (
        { new(): Merge<InstanceType<BaseClass>, A> } &
        StaticType<BaseClass>
    ) => {
        const class_ = class extends self {}
        Object.assign(class_.prototype, extension())
        return class_ as any
    }
)
