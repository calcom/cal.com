import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateOIDCInputSchema } from "./updateOIDC.schema";
type UpdateOIDCOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateOIDCInputSchema;
};
export declare const updateOIDCHandler: ({ ctx, input }: UpdateOIDCOptions) => Promise<import("@boxyhq/saml-jackson").OIDCSSORecord>;
export {};
