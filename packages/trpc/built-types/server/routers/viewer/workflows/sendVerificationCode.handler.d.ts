import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TSendVerificationCodeInputSchema } from "./sendVerificationCode.schema";
type SendVerificationCodeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSendVerificationCodeInputSchema;
};
export declare const sendVerificationCodeHandler: ({ ctx, input }: SendVerificationCodeOptions) => Promise<void>;
export {};
