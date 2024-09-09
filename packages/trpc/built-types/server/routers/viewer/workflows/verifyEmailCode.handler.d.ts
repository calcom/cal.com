import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TVerifyEmailCodeInputSchema } from "./verifyEmailCode.schema";
type VerifyEmailCodeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TVerifyEmailCodeInputSchema;
};
export declare const verifyEmailCodeHandler: ({ ctx, input }: VerifyEmailCodeOptions) => Promise<true>;
export {};
