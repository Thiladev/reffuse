import { Effect } from "effect"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


class Reffuse extends ReffuseHelpers.make([]) {}

class MyService extends Effect.Service<MyService>()("MyService", {
    succeed: {}
}) {}

const MyContext = ReffuseContext.make<MyService>()


const make = <Ext extends object>(extension: Ext) =>
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
        class_.prototype = { ...class_.prototype, ...extension } as any
        return class_ as any
    }

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
                ReffuseHelpers.ReffuseHelpers<R1 | R2[number]>
            >
        } &
        Merge<
            StaticType<BaseClass>,
            StaticType<ReffuseHelpers.ReffuseHelpersClass<R1 | R2[number]>>
        >
    ) => class extends self {
        readonly contexts = [...self.contexts, ...contexts]
    } as any


const withMyContext = withContexts(MyContext)
const clsWithMyContext = withMyContext(Reffuse)
class ReffuseWithMyContext extends clsWithMyContext {}


const withProut = make({
    prout<R>(this: ReffuseHelpers.ReffuseHelpers<R>) {}
})

class MyReffuse extends Reffuse.pipe(
    withProut,
    withContexts(MyContext),
) {}

new MyReffuse().useFork()
