import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";
type GetVerifiedEmailsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetVerifiedEmailsInputSchema;
};
export declare const getVerifiedEmailsHandler: ({ ctx, input }: GetVerifiedEmailsOptions) => Promise<string[]>;
export {};
