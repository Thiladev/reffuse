import { FetchHttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { QueryClient } from "@reffuse/extension-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { Layer } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ReffuseRuntime } from "reffuse"
import { QueryErrorHandler, QueryErrorHandlerLive, VQueryErrorHandler } from "./QueryErrorHandler"
import { GlobalContext } from "./reffuse"
import { routeTree } from "./routeTree.gen"


const layer = Layer.empty.pipe(
    Layer.provideMerge(Clipboard.layer),
    Layer.provideMerge(Geolocation.layer),
    Layer.provideMerge(Permissions.layer),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(QueryClient.layer({ ErrorHandler: QueryErrorHandler })),
    Layer.provideMerge(QueryErrorHandlerLive),
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
            <GlobalContext.Provider layer={layer}>
                <VQueryErrorHandler />
                <RouterProvider router={router} />
            </GlobalContext.Provider>
        </ReffuseRuntime.Provider>
    </StrictMode>
)
