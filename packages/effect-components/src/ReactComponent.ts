import { Effect, Runtime, type Scope } from "effect"
import type * as React from "react"


export interface ReactComponent<P, E, R> {
    readonly fn: (props: P) => Effect.Effect<React.ReactNode, E, R | Scope.Scope>
    use(callback: (Component: React.FC<P>) => React.ReactNode): Effect.Effect<React.ReactNode, never, R>
}

const ReactComponentPrototype: Omit<ReactComponent<any, any, any>, "fn"> = {
    use(this: ReactComponent<any, any, any>, callback) {
        return Effect.map(
            Effect.runtime(),
            runtime => callback(props => Runtime.runSync(runtime)(this.fn(props))),
        )
    }
}


export const make = <P, E, R>(
    fn: (props: P) => Effect.Effect<React.ReactNode, E, R | Scope.Scope>
): ReactComponent<P, E, R> => Object.setPrototypeOf(
    { fn },
    ReactComponentPrototype,
)
