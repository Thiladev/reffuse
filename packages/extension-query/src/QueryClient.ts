import { Context, Effect, Layer } from "effect"


interface MyService<T> {
    readonly value: T
}

const MyServiceAnyTag = Context.GenericTag<MyService<any>>("MyService")
const MyServiceStringTag = Context.GenericTag<MyService<string>>("MyService")

declare const MyServiceAnyLayer: Layer.Layer<Context.Tag.Service<typeof MyServiceAnyTag>>
declare const MyServiceStringLayer: Layer.Layer<Context.Tag.Service<typeof MyServiceStringTag>>


const prg = Effect.gen(function*() {
    yield* MyServiceAnyTag
    yield* MyServiceStringTag
}).pipe(
    Effect.provide(MyServiceStringLayer)
)
