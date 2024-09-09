import type { TrpcSessionUser } from "../../../trpc";
import type { TResendVerifyEmailSchema } from "./resendVerifyEmail.schema";
type ResendEmailOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TResendVerifyEmailSchema;
};
export declare const resendVerifyEmail: ({ input, ctx }: ResendEmailOptions) => Promise<{
    ok: boolean;
    skipped: boolean;
}>;
export {};
