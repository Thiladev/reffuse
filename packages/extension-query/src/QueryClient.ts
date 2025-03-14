import { Context, Effect, Layer } from "effect"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<EH, HandledE> {
    readonly ErrorHandler: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}


export interface LayerProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export const layer = <EH = never, HandledE = never>(
    props: LayerProps<EH, HandledE>
): Layer.Layer<QueryClient<EH, HandledE>> =>
    Layer.effect(Context.GenericTag<QueryClient<EH, HandledE>>("@reffuse/extension-query/QueryClient"), Effect.succeed({
        ErrorHandler: props.ErrorHandler
    }))
