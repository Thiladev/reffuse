import { Runtime } from "effect"
import * as React from "react"


export const Context = React.createContext<Runtime.Runtime<never>>(null!)

export const Provider = function ReffuseRuntimeReactProvider(props: {
    readonly children?: React.ReactNode
}) {
    return React.createElement(Context, {
        ...props,
        value: Runtime.defaultRuntime,
    })
}

export const useRuntime = () => React.useContext(Context)
