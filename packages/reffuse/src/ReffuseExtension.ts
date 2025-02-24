import { Effect } from "effect"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


class Reffuse extends ReffuseHelpers.ReffuseHelpers<never> {}

class MyService extends Effect.Service<MyService>()("MyService", {
    succeed: {}
}) {}

const MyContext = ReffuseContext.make<MyService>()


const make = <Ext extends object>(extension: Ext) =>
    <
        BaseClass extends typeof Reffuse,
        R,
    >(
        base: BaseClass & typeof Reffuse
    ): (
        { new(): Merge<InstanceType<BaseClass>, Ext> } &
        StaticType<BaseClass>
    ) => {
        const class_ = class extends base {}
        return class_
    }

export const withContexts = <R2 extends Array<unknown>>(
    ...contexts: [...{ [K in keyof R2]: ReffuseContext.ReffuseContext<R2[K]> }]
) =>
    <
        BaseClass extends typeof ReffuseHelpers.ReffuseHelpers<R1>,
        R1
    >(
        self: BaseClass & { new(): ReffuseHelpers.ReffuseHelpers<R1> }
    ): (
        {
            new(): Merge<
                InstanceType<BaseClass>,
                ReffuseHelpers.ReffuseHelpers<R1 | R2[number]>
            >
        } &
        StaticType<BaseClass>
    ) => new self().pipe(
        instance => class extends self {
            readonly contexts = [...instance.contexts, ...contexts] as any
        } as any
    )


const withMyContext = withContexts(MyContext)
const clsWithMyContext = withMyContext(Reffuse)
class ReffuseWithMyContext extends clsWithMyContext {}

const t = new ReffuseWithMyContext()


const cls1 = make({
    prout<R>(this: ReffuseHelpers.ReffuseHelpers<R>) {}
})(Reffuse)

class Cls1 extends cls1 {}

const cls2 = make({
    aya() {}
})(cls)
