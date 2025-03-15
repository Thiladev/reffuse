import { Context, Effect, Layer } from "effect"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<EH, HandledE> {
    readonly ErrorHandler: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export type Tag<EH, HandledE> = Context.Tag<QueryClient<EH, HandledE>, QueryClient<EH, HandledE>>
export const makeTag = <EH = never, HandledE = never>(): Tag<EH, HandledE> => Context.GenericTag("@reffuse/extension-query/QueryClient")


export interface MakeProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export type MakeResult<EH, HandledE> = [
    tag: Tag<EH, HandledE>,
    layer: Layer.Layer<
        | QueryClient<EH, HandledE>
        | (EH extends ErrorHandler.DefaultErrorHandler
            ? ErrorHandler.DefaultErrorHandler
            : never)
    >,
]

export const make = <
    EH = ErrorHandler.DefaultErrorHandler,
    HandledE = never,
>(
    props?: MakeProps<EH, HandledE>
): MakeResult<EH, HandledE> => [
    makeTag(),

    Layer.empty.pipe(
        Layer.provideMerge(
            Layer.effect(makeTag<EH, HandledE>(), Effect.succeed({
                ErrorHandler: (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
            }))
        ),

        Layer.provideMerge((props?.ErrorHandler
            ? Layer.empty
            : ErrorHandler.DefaultErrorHandlerLive
        ) as Layer.Layer<ErrorHandler.DefaultErrorHandler>),
    ),
]
