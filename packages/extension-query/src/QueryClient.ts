import { Context, Effect, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as QueryErrorHandler from "./QueryErrorHandler.js"


export interface QueryClient<FallbackA, HandledE> {
    readonly errorHandler: QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>
}


export interface MakeProps<FallbackA, HandledE, E, R> {
    readonly errorHandler: Effect.Effect<QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>, E, R>
}

export const make = <FallbackA, HandledE, E, R>(
    { errorHandler }: MakeProps<FallbackA, HandledE, E, R>
): Effect.Effect<QueryClient<FallbackA, HandledE>, E, R> => Effect.Do.pipe(
    Effect.bind("errorHandler", () => errorHandler)
)


const id = "@reffuse/extension-query/QueryClient"

export type TagClassShape<FallbackA, HandledE> = Context.TagClassShape<typeof id, QueryClient<FallbackA, HandledE>>
export type GenericTagClass<FallbackA, HandledE> = Context.TagClass<
    TagClassShape<FallbackA, HandledE>,
    typeof id,
    QueryClient<FallbackA, HandledE>
>
export const makeGenericTagClass = <FallbackA = never, HandledE = never>(): GenericTagClass<FallbackA, HandledE> => Context.Tag(id)()


export interface ServiceProps<FallbackA = never, HandledE = never, E = never, R = never> {
    readonly errorHandler?: Effect.Effect<QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>, E, R>
}

export interface ServiceResult<Self, FallbackA, HandledE, E, R> extends Context.TagClass<
    Self,
    typeof id,
    QueryClient<FallbackA, HandledE>
> {
    readonly Default: Layer.Layer<QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>, E, R>
}

export const Service = <Self>() => (
    <
        FallbackA = QueryErrorHandler.Fallback<Context.Tag.Service<typeof QueryErrorHandler.DefaultQueryErrorHandler>>,
        HandledE = QueryErrorHandler.Error<Context.Tag.Service<typeof QueryErrorHandler.DefaultQueryErrorHandler>>,
        E = never,
        R = never,
    >(
        props?: ServiceProps<FallbackA, HandledE, E, R>
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
