import type { Schema } from "effect"


export interface Form<A, I, R> {
    readonly schema: Schema.Schema<A, I, R>
}
