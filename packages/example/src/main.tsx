import { FetchHttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { Layer } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ReffuseRuntime } from "reffuse"
import { AppQueryClient, AppQueryErrorHandler } from "./query"
import { RootContext } from "./reffuse"
import { routeTree } from "./routeTree.gen"


const layer = Layer.empty.pipe(
    Layer.provideMerge(AppQueryClient.Live),
    Layer.provideMerge(AppQueryErrorHandler.Live),
    Layer.provideMerge(Clipboard.layer),
    Layer.provideMerge(Geolocation.layer),
    Layer.provideMerge(Permissions.layer),
    Layer.provideMerge(FetchHttpClient.layer),
)

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}


createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ReffuseRuntime.Provider>
            <RootContext.Provider layer={layer}>
                <RouterProvider router={router} />
            </RootContext.Provider>
        </ReffuseRuntime.Provider>
    </StrictMode>
)
