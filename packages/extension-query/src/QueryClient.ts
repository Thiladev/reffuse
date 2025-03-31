import { Context, Effect, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as ErrorHandler from "./ErrorHandler.js"


export interface QueryClient<HandledE> {
    readonly errorHandler: ErrorHandler.ErrorHandler<HandledE>
}


const id = "@reffuse/extension-query/QueryClient"

export type TagClassShape<HandledE> = Context.TagClassShape<typeof id, QueryClient<HandledE>>
export type GenericTagClass<HandledE> = Context.TagClass<TagClassShape<HandledE>, typeof id, QueryClient<HandledE>>
export const makeGenericTagClass = <HandledE = never>(): GenericTagClass<HandledE> => Context.Tag(id)()


export interface ServiceProps<EH, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
}

export interface ServiceResult<Self, EH, HandledE> extends Context.TagClass<Self, typeof id, QueryClient<HandledE>> {
    readonly Live: Layer.Layer<
        Self,
        never,
        EH extends ErrorHandler.DefaultErrorHandler ? never : EH
    >
}

export const Service = <Self>() => (
    <
        EH = ErrorHandler.DefaultErrorHandler,
        HandledE = ErrorHandler.Error<Context.Tag.Service<ErrorHandler.DefaultErrorHandler>>,
    >(
        props?: ServiceProps<EH, HandledE>
    ): ServiceResult<Self, EH, HandledE> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, EH, HandledE>

        (TagClass as Mutable<typeof TagClass>).Live = Layer.effect(TagClass, Effect.Do.pipe(
            Effect.bind("errorHandler", () =>
                (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Effect.Effect<
                    ErrorHandler.ErrorHandler<HandledE>,
                    never,
                    EH extends ErrorHandler.DefaultErrorHandler ? never : EH
                >
            )
        ))

        return TagClass
    }
)
