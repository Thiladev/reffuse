import type * as AsyncData from "@typed/async-data"
import { type Cause, Effect, type Fiber, type Option, type Stream, type SubscriptionRef } from "effect"
import * as QueryRunner from "./QueryRunner.js"


export const Tag = <const Id extends string>(id: Id) => <
    Self, K extends readonly unknown[], A, E = never
>() => Effect.Tag(id)<Self, QueryRunner.QueryRunner<K, A, E>>()


export const Service = <Self>() =>
