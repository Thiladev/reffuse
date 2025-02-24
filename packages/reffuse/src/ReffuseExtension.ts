import { Effect } from "effect"
import * as Reffuse from "./Reffuse.js"
import * as ReffuseContext from "./ReffuseContext.js"
import * as ReffuseHelpers from "./ReffuseHelpers.js"
import type { Merge, StaticType } from "./types.js"


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


const withMyContext = Reffuse.withContexts(MyContext)
const clsWithMyContext = withMyContext(Reffuse.Reffuse)
class ReffuseWithMyContext extends clsWithMyContext {}


const withProut = make({
    prout<R>(this: ReffuseHelpers.ReffuseHelpers<R>) {}
})

class MyReffuse extends Reffuse.Reffuse.pipe(
    withProut,
    Reffuse.withContexts(MyContext),
) {}

new MyReffuse().useFork()
