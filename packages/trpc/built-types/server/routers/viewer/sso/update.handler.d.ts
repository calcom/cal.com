import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";
type UpdateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateInputSchema;
};
export declare const updateHandler: ({ ctx, input }: UpdateOptions) => Promise<import("@boxyhq/saml-jackson").SAMLSSORecord>;
export {};
