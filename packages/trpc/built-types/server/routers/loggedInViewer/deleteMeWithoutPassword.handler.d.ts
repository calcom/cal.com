import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type DeleteMeWithoutPasswordOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const deleteMeWithoutPasswordHandler: ({ ctx }: DeleteMeWithoutPasswordOptions) => Promise<void>;
export {};
