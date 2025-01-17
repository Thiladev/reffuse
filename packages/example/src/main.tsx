import { FetchHttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { ReffuseRuntime } from "@thilawyn/reffuse"
import { Layer } from "effect"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { GlobalContext } from "./reffuse"
import { routeTree } from "./routeTree.gen"


const layer = Layer.empty.pipe(
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
            <GlobalContext.Provider layer={layer}>
                <RouterProvider router={router} />
            </GlobalContext.Provider>
        </ReffuseRuntime.Provider>
    </StrictMode>
)
