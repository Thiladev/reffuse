import type { Effect } from "effect"
import * as ReffuseContext from "./ReffuseContext.js"
import * as Reffuse from "./Reffuse.js"
import type { Simplify } from "effect/Types"


const make = <T extends object>(extension: T) =>
    <R extends typeof Reffuse.Reffuse>(base: R) => {
        const class_ = class extends base {}
    }
