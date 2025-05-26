import { type Effect, type Stream } from "effect"
import { ReffuseExtension, type ReffuseNamespace } from "reffuse"
import * as MutationRunner from "./MutationRunner.js"
import * as QueryClient from "./QueryClient.js"
import type * as QueryProgress from "./QueryProgress.js"
import * as QueryRunner from "./QueryRunner.js"


export interface UseQueryProps<K extends readonly unknown[], A, E, R> {
    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
    readonly options?: QueryRunner.RunOptions
}

export interface UseMutationProps<K extends readonly unknown[], A, E, R> {
    readonly mutation: (key: K) => Effect.Effect<A, E, R | QueryProgress.QueryProgress>
}


export const QueryExtension = ReffuseExtension.make(() => ({
    useQuery<
        QK extends readonly unknown[],
        QA,
        FallbackA,
        QE,
        HandledE,
        QR extends R,
        R,
    >(
        this: ReffuseNamespace.ReffuseNamespace<R | QueryClient.TagClassShape<FallbackA, HandledE>>,
        props: UseQueryProps<QK, QA, QE, QR>,
    ): QueryRunner.QueryRunner<QK, QA | FallbackA, Exclude<QE, HandledE>> {
        const runner = this.useMemo(() => QueryRunner.make({
            QueryClient: QueryClient.makeGenericTagClass<FallbackA, HandledE>(),
            key: props.key,
            query: props.query,
        }), [props.key])

        this.useFork(() => QueryRunner.run(runner, props.options), [runner])

        return runner
    },

    useMutation<
        QK extends readonly unknown[],
        QA,
        FallbackA,
        QE,
        HandledE,
        QR extends R,
        R,
    >(
        this: ReffuseNamespace.ReffuseNamespace<R | QueryClient.TagClassShape<FallbackA, HandledE>>,
        props: UseMutationProps<QK, QA, QE, QR>,
    ): MutationRunner.MutationRunner<QK, QA | FallbackA, Exclude<QE, HandledE>> {
        return this.useMemo(() => MutationRunner.make({
            QueryClient: QueryClient.makeGenericTagClass<FallbackA, HandledE>(),
            mutation: props.mutation,
        }), [])
    },
}))
