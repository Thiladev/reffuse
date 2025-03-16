import { Context, Effect, Layer } from "effect"
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

export const Service: <
    EH = ErrorHandler.DefaultErrorHandler,
    HandledE = never,
>(
    props?: ServiceProps<EH, HandledE>
) =>
    <Self>() =>
        & Context.TagClass<Self, typeof Id, QueryClient<EH, HandledE>>
        & { readonly Live: Layer.Layer<
            | QueryClient<EH, HandledE>
            | (EH extends ErrorHandler.DefaultErrorHandler
                ? ErrorHandler.DefaultErrorHandler
                : never)
        > }
= props => () => {
    const TagClass = Context.Tag(Id)() as any
    TagClass.Live = Layer.empty.pipe(
        Layer.provideMerge(
            Layer.effect(TagClass, Effect.succeed({
                ErrorHandler: props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler
            }))
        ),

        Layer.provideMerge((props?.ErrorHandler
            ? Layer.empty
            : ErrorHandler.DefaultErrorHandlerLive
        ),
    ))

    return TagClass
}


// export interface MakeProps<EH, HandledE> {
//     readonly ErrorHandler?: Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
// }

// export type MakeResult<EH, HandledE> = [
//     tag: Tag<EH, HandledE>,
//     layer: Layer.Layer<
//         | QueryClient<EH, HandledE>
//         | (EH extends ErrorHandler.DefaultErrorHandler
//             ? ErrorHandler.DefaultErrorHandler
//             : never)
//     >,
// ]

// export const make = <
//     EH = ErrorHandler.DefaultErrorHandler,
//     HandledE = never,
// >(
//     props?: MakeProps<EH, HandledE>
// ): MakeResult<EH, HandledE> => [
//     makeTag(),

//     Layer.empty.pipe(
//         Layer.provideMerge(
//             Layer.effect(makeTag<EH, HandledE>(), Effect.succeed({
//                 ErrorHandler: (props?.ErrorHandler ?? ErrorHandler.DefaultErrorHandler) as Context.Tag<EH, ErrorHandler.ErrorHandler<HandledE>>
//             }))
//         ),

//         Layer.provideMerge((props?.ErrorHandler
//             ? Layer.empty
//             : ErrorHandler.DefaultErrorHandlerLive
//         ) as Layer.Layer<ErrorHandler.DefaultErrorHandler>),
//     ),
// ]
