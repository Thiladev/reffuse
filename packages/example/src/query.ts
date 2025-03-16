import { HttpClientError } from "@effect/platform"
import { ErrorHandler, QueryClient } from "@reffuse/extension-query"


export class AppQueryErrorHandler extends ErrorHandler.Service("AppQueryErrorHandler")<AppQueryErrorHandler,
    HttpClientError.HttpClientError
>() {}

export class AppQueryClient extends QueryClient.Service({ ErrorHandler: AppQueryErrorHandler })<AppQueryClient>() {}
