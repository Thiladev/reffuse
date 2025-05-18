import { Todo } from "@/domain"
import { KeyValueStore } from "@effect/platform"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { PlatformError } from "@effect/platform/Error"
import { Chunk, Context, Effect, identity, Layer, ParseResult, Ref, Schema, Stream, SubscriptionRef } from "effect"


export class TodosState extends Context.Tag("TodosState")<TodosState, {
    readonly todos: SubscriptionRef.SubscriptionRef<Chunk.Chunk<Todo.Todo>>

    readonly load: Effect.Effect<void, PlatformError | ParseResult.ParseError>
    readonly save: Effect.Effect<void, PlatformError | ParseResult.ParseError>

    readonly prepend: (todo: Todo.Todo) => Effect.Effect<void>
    readonly replace: (index: number, todo: Todo.Todo) => Effect.Effect<void>
    readonly remove: (index: number) => Effect.Effect<void>
    // readonly moveUp: (index: number) => Effect.Effect<void, Cause.NoSuchElementException>
    // readonly moveDown: (index: number) => Effect.Effect<void, Cause.NoSuchElementException>
}>() {}


export const make = (key: string) => Layer.effect(TodosState, Effect.gen(function*() {
    const readFromLocalStorage = KeyValueStore.KeyValueStore.pipe(
        Effect.flatMap(kv => kv.get(key)),
        Effect.flatMap(identity),
        Effect.flatMap(Schema.decode(
            Schema.compose(Schema.parseJson(), Schema.Chunk(Todo.TodoFromJson))
        )),
        Effect.catchTag("NoSuchElementException", () => Effect.succeed(Chunk.empty<Todo.Todo>())),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    )

    const writeToLocalStorage = (values: Chunk.Chunk<Todo.Todo>) => KeyValueStore.KeyValueStore.pipe(
        Effect.flatMap(kv => values.pipe(
            Schema.encode(
                Schema.compose(Schema.parseJson(), Schema.Chunk(Todo.TodoFromJson))
            ),
            Effect.flatMap(v => kv.set(key, v)),
        )),
        Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    )

    const todos = yield* SubscriptionRef.make(yield* readFromLocalStorage)

    const load = Effect.flatMap(readFromLocalStorage, v => Ref.set(todos, v))
    const save = Effect.flatMap(todos, writeToLocalStorage)

    const prepend = (todo: Todo.Todo) => Ref.update(todos, Chunk.prepend(todo))
    const replace = (index: number, todo: Todo.Todo) => Ref.update(todos, Chunk.replace(index, todo))
    const remove = (index: number) => Ref.update(todos, Chunk.remove(index))

    // const moveUp = (index: number) => Effect.gen(function*() {

    // })

    // Sync changes with local storage
    yield* Effect.forkScoped(todos.changes.pipe(
        Stream.debounce("500 millis"),
        Stream.runForEach(writeToLocalStorage),
    ))

    return {
        todos,
        load,
        save,
        prepend,
        replace,
        remove,
    }
}))
