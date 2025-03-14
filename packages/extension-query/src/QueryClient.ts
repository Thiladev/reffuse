import { Context, Effect, Layer } from "effect"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<EH, HandledE> {
    readonly ErrorHandler: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}


export interface LayerProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export const layer = <
    EH = ErrorHandler.DefaultErrorHandler,
    HandledE = never,
>(
    props?: LayerProps<EH, HandledE>
): Layer.Layer<
    | QueryClient<EH, HandledE>
    | (EH extends ErrorHandler.DefaultErrorHandler
        ? ErrorHandler.DefaultErrorHandler
        : never)
> => Layer.empty.pipe(
    Layer.provideMerge(Layer.effect(
        Context.GenericTag<QueryClient<EH, HandledE>>("@reffuse/extension-query/QueryClient"),
        Effect.succeed({
            ErrorHandler: (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
        })),
    ),

    Layer.provideMerge((props?.ErrorHandler
        ? Layer.empty
        : ErrorHandler.DefaultErrorHandlerLive
    ) as Layer.Layer<ErrorHandler.DefaultErrorHandler>),
)
