import type { TrpcSessionUser } from "../../../trpc";
import type { ZCreateInputSchema } from "./create.schema";
type Options = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZCreateInputSchema;
};
export declare const createHandler: ({ ctx, input }: Options) => Promise<import("@boxyhq/saml-jackson").Directory>;
export default createHandler;
