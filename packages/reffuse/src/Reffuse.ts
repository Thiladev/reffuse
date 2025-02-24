import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


export class Reffuse extends ReffuseHelpers.make() {}

export const withContexts = <R2 extends Array<unknown>>(
    ...contexts: [...{ [K in keyof R2]: ReffuseContext.ReffuseContext<R2[K]> }]
) =>
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
        readonly contexts = [...self.contexts, ...contexts]
    } as any
