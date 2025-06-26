import { Effect, Runtime, type Scope } from "effect"
import * as React from "react"


export interface ReactComponent<P, E, R> {
    (props: P): Effect.Effect<React.ReactNode, E, R | Scope.Scope>
}

export const use = <P, E, R>(
    self: ReactComponent<P, E, R>,
    fn: (Component: React.FC<P>) => React.ReactNode,
): Effect.Effect<React.ReactNode, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => fn(props => Runtime.runSync(runtime)(self(props))),
)

export const useFC = <P, E, R>(
    self: ReactComponent<P, E, R>
): Effect.Effect<React.FC<P>, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => props => Runtime.runSync(runtime)(self(props)),
)

export const createElement = <P, E, R>(
    self: ReactComponent<P, E, R>,
    props?: React.Attributes & P | null,
    ...children: React.ReactNode[]
): Effect.Effect<React.ReactNode, never, R | Scope.Scope> => Effect.map(
    Effect.runtime(),
    runtime => React.createElement(
        props => Runtime.runSync(runtime)(self(props)),
        props,
        ...children,
    ),
)

export const useScope: Effect.Effect<void> = Effect.gen(function*() {

})
