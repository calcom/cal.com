import type { TrpcSessionUser } from "../../../trpc";
type CreateAccountPasswordOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const createAccountPasswordHandler: ({ ctx }: CreateAccountPasswordOptions) => Promise<void>;
export {};
