import { Context, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<EH, HandledE> {
    readonly ErrorHandler: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}


const id = "@reffuse/extension-query/QueryClient"

export type TagClassShape<EH, HandledE> = Context.TagClassShape<typeof id, QueryClient<EH, HandledE>>
export type GenericTagClass<EH, HandledE> = Context.TagClass<TagClassShape<EH, HandledE>, typeof id, QueryClient<EH, HandledE>>
export const makeGenericTagClass = <EH = never, HandledE = never>(): GenericTagClass<EH, HandledE> => Context.Tag(id)()


export interface ServiceProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export interface ServiceResult<Self, EH, HandledE> extends Context.TagClass<Self, typeof id, QueryClient<EH, HandledE>> {
    readonly Live: Layer.Layer<Self>
}

export const Service = <Self>() => (
    <
        EH = ErrorHandler.DefaultErrorHandler,
        HandledE = ErrorHandler.Error<Context.Tag.Service<ErrorHandler.DefaultErrorHandler>>,
    >(
        props?: ServiceProps<EH, HandledE>
    ): ServiceResult<Self, EH, HandledE> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, EH, HandledE>
        (TagClass as Mutable<typeof TagClass>).Live = Layer.succeed(TagClass, {
            ErrorHandler: (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
        })
        return TagClass
    }
)
