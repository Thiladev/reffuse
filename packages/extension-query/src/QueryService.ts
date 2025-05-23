import { Effect } from "effect"
import * as QueryRunner from "./QueryRunner.js"


export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never
>() => Effect.Tag(id)<Self, QueryRunner.QueryRunner<K, A, E>>()
