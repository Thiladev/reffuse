import { HttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { LazyRefExtension } from "@reffuse/extension-lazyref"
import { QueryExtension } from "@reffuse/extension-query"
import { Context } from "effect"
import { Reffuse, ReffuseContext } from "reffuse"
import { AppQueryClient, AppQueryErrorHandler } from "./query"


export const GlobalContext = ReffuseContext.make<
    | Clipboard.Clipboard
    | Geolocation.Geolocation
    | Permissions.Permissions
    | HttpClient.HttpClient
    | Context.Tag.Service<typeof AppQueryClient>
    | AppQueryErrorHandler
>()

export class GlobalReffuse extends Reffuse.Reffuse.pipe(
    Reffuse.withExtension(LazyRefExtension),
    Reffuse.withExtension(QueryExtension),
    Reffuse.withContexts(GlobalContext),
) {}

export const R = new GlobalReffuse()
