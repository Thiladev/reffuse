import { Effect, Runtime, type Scope } from "effect"
import type * as React from "react"


export interface ReactComponent<P, E, R> {
    (props: P): Effect.Effect<React.ReactNode, E, R | Scope.Scope>
}

export const use = <P, E, R>(
    self: ReactComponent<P, E, R>,
    fn: (Component: React.FC<P>) => React.ReactNode
): Effect.Effect<React.ReactNode, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => fn(props => Runtime.runSync(runtime)(self(props))),
)
