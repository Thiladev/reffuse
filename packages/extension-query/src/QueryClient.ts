import { Context, Effect, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<EH, HandledE> {
    readonly ErrorHandler: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}


const Id = "@reffuse/extension-query/QueryClient"

export type TagClassShape<EH, HandledE> = Context.TagClassShape<typeof Id, QueryClient<EH, HandledE>>
export type GenericTagClass<EH, HandledE> = Context.TagClass<TagClassShape<EH, HandledE>, typeof Id, QueryClient<EH, HandledE>>
export const makeGenericTagClass = <EH = never, HandledE = never>() => Context.GenericTag(Id) as GenericTagClass<EH, HandledE>


export interface ServiceProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export interface ServiceResult<Self, EH, HandledE> extends Context.TagClass<Self, typeof Id, QueryClient<EH, HandledE>> {
    readonly Live: Layer.Layer<
        | Self
        | (EH extends ErrorHandler.DefaultErrorHandler
            ? ErrorHandler.DefaultErrorHandler
            : never)
    >
}

export const Service = <
    EH = ErrorHandler.DefaultErrorHandler,
    HandledE = never,
>(
    props?: ServiceProps<EH, HandledE>
) => (
    <Self>(): ServiceResult<Self, EH, HandledE> => {
        const TagClass = Context.Tag(Id)() as ServiceResult<Self, EH, HandledE>
        (TagClass as Mutable<typeof TagClass>).Live = Layer.empty.pipe(
            Layer.provideMerge(
                Layer.effect(TagClass, Effect.succeed({
                    ErrorHandler: (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
                }))
            ),

            Layer.provideMerge((props?.ErrorHandler
                ? Layer.empty
                : ErrorHandler.DefaultErrorHandlerLive
            ) as Layer.Layer<ErrorHandler.DefaultErrorHandler>),
        )
        return TagClass
    }
)
