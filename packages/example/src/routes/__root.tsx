import { Container, Flex, Theme } from "@radix-ui/themes"
import "@radix-ui/themes/styles.css"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import "../index.css"


export const Route = createRootRoute({
    component: Root
})

function Root() {
    return (
        <Theme>
            <Container>
                <Flex direction="row" justify="center" align="center" gap="2">
                    <Link to="/">Index</Link>
                    <Link to="/time">Time</Link>
                    <Link to="/count">Count</Link>
                </Flex>
            </Container>

            <Outlet />
            <TanStackRouterDevtools />
        </Theme>
    )
}