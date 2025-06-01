import { Context, Effect, identity, Layer } from "effect"
import type { Mutable } from "effect/Types"
import * as QueryErrorHandler from "./QueryErrorHandler.js"


export interface QueryClient<FallbackA, HandledE> {
    readonly errorHandler: QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>
}


export interface MakeProps<FallbackA, HandledE> {
    readonly errorHandler: QueryErrorHandler.QueryErrorHandler<FallbackA, HandledE>
}

export const make = <FallbackA, HandledE>(
    { errorHandler }: MakeProps<FallbackA, HandledE>
): Effect.Effect<QueryClient<FallbackA, HandledE>> => Effect.Do.pipe(
    Effect.let("errorHandler", () => errorHandler)
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
    readonly Default: Layer.Layer<Self, E, R>
}

export const Service = <Self>() => (
    <FallbackA = never, HandledE = never, E = never, R = never>(
        props?: ServiceProps<FallbackA, HandledE, E, R>
    ): ServiceResult<Self, FallbackA, HandledE, E, R> => {
        const TagClass = Context.Tag(id)() as ServiceResult<Self, FallbackA, HandledE, E, R>

        (TagClass as Mutable<typeof TagClass>).Default = Layer.effect(TagClass, Effect.flatMap(
            props?.errorHandler ?? QueryErrorHandler.make<never>()(identity),
            errorHandler => make({ errorHandler }),
        ))

        return TagClass
    }
)
