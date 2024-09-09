import type { TrpcSessionUser } from "../../../trpc";
import type { TChangePasswordInputSchema } from "./changePassword.schema";
type ChangePasswordOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TChangePasswordInputSchema;
};
export declare const changePasswordHandler: ({ input, ctx }: ChangePasswordOptions) => Promise<void>;
export {};
