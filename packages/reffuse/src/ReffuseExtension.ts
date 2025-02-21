import * as Reffuse from "./Reffuse.js"
import type { Merge, StaticType } from "./types.js"


const make = <Ext extends object>(extension: Ext) =>
    <
        BaseClass extends typeof Reffuse.Reffuse<R>,
        R,
    >(
        base: BaseClass & typeof Reffuse.Reffuse<R>
    ): (
        { new(): Merge<InstanceType<BaseClass>, Ext> } &
        StaticType<BaseClass>
    ) => {
        const class_ = class extends base {}
        return class_
    }


const cls = make({
    prout<R>(this: Reffuse.Reffuse<R>) {}
})(Reffuse.Reffuse)

class Cls extends cls {}

const cls2 = make({
    aya() {}
})(cls)
