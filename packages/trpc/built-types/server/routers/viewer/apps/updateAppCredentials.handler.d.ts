import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateAppCredentialsInputSchema } from "./updateAppCredentials.schema";
export type UpdateAppCredentialsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateAppCredentialsInputSchema;
};
export declare const updateAppCredentialsHandler: ({ ctx, input }: UpdateAppCredentialsOptions) => Promise<boolean>;
