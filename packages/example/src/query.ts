import { HttpClientError } from "@effect/platform"
import { QueryClient, QueryErrorHandler } from "@reffuse/extension-query"
import { Effect } from "effect"


export class AppQueryErrorHandler extends QueryErrorHandler.Service<AppQueryErrorHandler,
    HttpClientError.HttpClientError
>()(
    "AppQueryErrorHandler",

    (self, failure, defect) => self.pipe(
        Effect.catchTags({
            RequestError: failure,
            ResponseError: failure,
        }),

        Effect.catchAllDefect(defect),
    ),
) {}

export class AppQueryClient extends QueryClient.Service<AppQueryClient>()({ ErrorHandler: AppQueryErrorHandler }) {}
