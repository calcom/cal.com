import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TDeleteCredentialInputSchema } from "./deleteCredential.schema";
type DeleteCredentialOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TDeleteCredentialInputSchema;
};
export declare const deleteCredentialHandler: ({ ctx, input }: DeleteCredentialOptions) => Promise<void>;
export {};
