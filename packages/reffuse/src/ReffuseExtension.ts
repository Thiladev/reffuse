import type { Effect } from "effect"
import * as ReffuseContext from "./ReffuseContext.js"


interface ReffuseTest<R> {
    readonly contexts: readonly ReffuseContext.ReffuseContext<R>[]

    useEffect<A, E>(effect: Effect.Effect<A, E, R>): void
}

const ReffuseTestProto = {
    useEffect<A, E, R>(this: ReffuseTest<R>, effect: Effect.Effect<A, E>) {}
}

const make = (): ReffuseTest<never> => {
    const self = Object.create(ReffuseTestProto)
    self.contexts = []
    return self
}
