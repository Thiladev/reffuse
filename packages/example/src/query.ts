import { HttpClientError } from "@effect/platform"
import { ErrorHandler, QueryClient } from "@reffuse/extension-query"


export class AppQueryErrorHandler extends ErrorHandler.Tag("AppQueryErrorHandler")<AppQueryErrorHandler,
    HttpClientError.HttpClientError
>() {}
export const AppQueryErrorHandlerLive = ErrorHandler.layer(AppQueryErrorHandler)


export class AppQueryClient extends QueryClient.Service({ ErrorHandler: AppQueryErrorHandler })<AppQueryClient>() {}
