import { HttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { Reffuse, ReffuseContext } from "reffuse"


export const GlobalContext = ReffuseContext.make<
    | Clipboard.Clipboard
    | Geolocation.Geolocation
    | Permissions.Permissions
    | HttpClient.HttpClient
>()

export class GlobalReffuse extends Reffuse.Reffuse.pipe(
    Reffuse.withContexts(GlobalContext)
) {}

export const R = new GlobalReffuse()
