import type { TrpcSessionUser } from "../../../trpc";
import type { ZGetInputSchema } from "./get.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZGetInputSchema;
};
export declare const getHandler: ({ ctx, input }: Options) => Promise<import("@boxyhq/saml-jackson").Directory | null>;
export default getHandler;
