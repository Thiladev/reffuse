import { ReffuseExtension, type ReffuseNamespace } from "reffuse"


export const FormExtension = ReffuseExtension.make(() => ({
    useForm<A, E, R>(
        this: ReffuseNamespace.ReffuseNamespace<R>,
    ) {
    },
}))
