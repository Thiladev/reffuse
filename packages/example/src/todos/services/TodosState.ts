import { Todo } from "@/domain"
import { KeyValueStore } from "@effect/platform"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { PlatformError } from "@effect/platform/Error"
import { Chunk, Context, Effect, identity, Layer, ParseResult, Ref, Schema, SubscriptionRef } from "effect"


export class TodosState extends Context.Tag("TodosState")<TodosState, {
    readonly todos: SubscriptionRef.SubscriptionRef<Chunk.Chunk<Todo.Todo>>

    readonly readFromLocalStorage: Effect.Effect<void, PlatformError | ParseResult.ParseError>
    readonly saveToLocalStorage: Effect.Effect<void, PlatformError | ParseResult.ParseError>

    readonly prepend: (todo: Todo.Todo) => Effect.Effect<void>
    readonly replace: (index: number, todo: Todo.Todo) => Effect.Effect<void>
    readonly remove: (index: number) => Effect.Effect<void>
    // readonly moveUp: (index: number) => Effect.Effect<void, Cause.NoSuchElementException>
    // readonly moveDown: (index: number) => Effect.Effect<void, Cause.NoSuchElementException>
}>() {}


export const make = (key: string) => Layer.effect(TodosState, Effect.gen(function*() {
    const todos = yield* SubscriptionRef.make(Chunk.empty<Todo.Todo>())

    const readFromLocalStorage = KeyValueStore.KeyValueStore.pipe(
        Effect.flatMap(kv => kv.get(key)),
        Effect.flatMap(identity),
        Effect.flatMap(Schema.parseJson().pipe(
            Schema.compose(Schema.Chunk(Todo.TodoFromJson)),
            Schema.decode,
        )),
        Effect.flatMap(v => Ref.set(todos, v)),

        Effect.catchTag("NoSuchElementException", () => Ref.set(todos, Chunk.empty())),

        Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    )

    const saveToLocalStorage = Effect.all([KeyValueStore.KeyValueStore, todos]).pipe(
        Effect.flatMap(([kv, values]) => values.pipe(
            Schema.parseJson().pipe(
                Schema.compose(Schema.Chunk(Todo.TodoFromJson)),
                Schema.encode,
            ),
            Effect.flatMap(v => kv.set(key, v)),
        )),

        Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    )

    const prepend = (todo: Todo.Todo) => Ref.update(todos, Chunk.prepend(todo))
    const replace = (index: number, todo: Todo.Todo) => Ref.update(todos, Chunk.replace(index, todo))
    const remove = (index: number) => Ref.update(todos, Chunk.remove(index))

    // const moveUp = (index: number) => Effect.gen(function*() {

    // })

    yield* readFromLocalStorage

    return {
        todos,
        readFromLocalStorage,
        saveToLocalStorage,
        prepend,
        replace,
        remove,
    }
}))
