import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


export const make = <Ext extends object>(extension: () => Ext) =>
    <
        BaseClass extends ReffuseHelpers.ReffuseHelpersClass<R>,
        R
    >(
        self: BaseClass & ReffuseHelpers.ReffuseHelpersClass<R>
    ): (
        { new(): Merge<InstanceType<BaseClass>, Ext> } &
        StaticType<BaseClass>
    ) => {
        const class_ = class extends self {}
        Object.assign(class_.prototype, extension())
        return class_ as any
    }
