import { Runtime } from "effect"
import React from "react"


export const Context = React.createContext<Runtime.Runtime<never>>(null!)

export const Provider = (props: { readonly children?: React.ReactNode }) => (
    <Context
        {...props}
        value={Runtime.defaultRuntime}
    />
)
Provider.displayName = "ReffuseRuntimeReactProvider"

export const useRuntime = () => React.useContext(Context)
