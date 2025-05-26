import { Context, Effect, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as QueryErrorHandler from "./QueryErrorHandler.js"


export interface QueryClient<FallbackA, HandledE> {
    readonly errorHandler: QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>
}


const id = "@reffuse/extension-query/QueryClient"

export type TagClassShape<FallbackA, HandledE> = Context.TagClassShape<typeof id, QueryClient<FallbackA, HandledE>>
export type GenericTagClass<FallbackA, HandledE> = Context.TagClass<
    TagClassShape<FallbackA, HandledE>,
    typeof id,
    QueryClient<FallbackA, HandledE>
>
export const makeGenericTagClass = <FallbackA = never, HandledE = never>(): GenericTagClass<FallbackA, HandledE> => Context.Tag(id)()


export interface ServiceProps<EH, FallbackA, HandledE> {
    readonly ErrorHandler?: Context.Tag<EH, QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>>
}

export interface ServiceResult<Self, EH, FallbackA, HandledE> extends Context.TagClass<
    Self,
    typeof id,
    QueryClient<FallbackA, HandledE>
> {
    readonly Default: Layer.Layer<
        Self | (EH extends QueryErrorHandler.DefaultQueryErrorHandler ? EH : never),
        never,
        EH extends QueryErrorHandler.DefaultQueryErrorHandler ? never : EH
    >
}

export const Service = <Self>() => (
    <
        EH = QueryErrorHandler.DefaultQueryErrorHandler,
        FallbackA = QueryErrorHandler.Fallback<Context.Tag.Service<QueryErrorHandler.DefaultQueryErrorHandler>>,
        HandledE = QueryErrorHandler.Error<Context.Tag.Service<QueryErrorHandler.DefaultQueryErrorHandler>>,
    >(
        props?: ServiceProps<EH, FallbackA, HandledE>
    ): ServiceResult<Self, EH, FallbackA, HandledE> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, EH, FallbackA, HandledE>

        (TagClass as Mutable<typeof TagClass>).Default = Layer.effect(TagClass, Effect.Do.pipe(
            Effect.bind("errorHandler", () =>
                (props?.ErrorHandler ?? QueryErrorHandler.DefaultQueryErrorHandler) as Effect.Effect<
                    QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>,
                    never,
                    EH extends QueryErrorHandler.DefaultQueryErrorHandler ? never : EH
                >
            )
        )).pipe(
            Layer.provideMerge((props?.ErrorHandler
                ? Layer.empty
                : QueryErrorHandler.DefaultQueryErrorHandler.Default
            ) as Layer.Layer<EH>)
        )

        return TagClass
    }
)
