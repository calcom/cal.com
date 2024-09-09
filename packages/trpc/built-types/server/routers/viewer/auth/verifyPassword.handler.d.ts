import type { TrpcSessionUser } from "../../../trpc";
import type { TVerifyPasswordInputSchema } from "./verifyPassword.schema";
type VerifyPasswordOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TVerifyPasswordInputSchema;
};
export declare const verifyPasswordHandler: ({ input, ctx }: VerifyPasswordOptions) => Promise<void>;
export {};
