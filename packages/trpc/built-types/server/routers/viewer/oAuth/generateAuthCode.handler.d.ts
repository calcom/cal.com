import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGenerateAuthCodeInputSchema } from "./generateAuthCode.schema";
type AddClientOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGenerateAuthCodeInputSchema;
};
export declare const generateAuthCodeHandler: ({ ctx, input }: AddClientOptions) => Promise<{
    client: {
        name: string;
        clientId: string;
        redirectUri: string;
    };
    authorizationCode: string;
}>;
export {};
