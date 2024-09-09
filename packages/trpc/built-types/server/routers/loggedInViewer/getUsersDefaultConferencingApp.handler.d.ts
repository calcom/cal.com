import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type GetUsersDefaultConferencingAppOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const getUsersDefaultConferencingAppHandler: ({ ctx, }: GetUsersDefaultConferencingAppOptions) => Promise<{
    appSlug?: string | undefined;
    appLink?: string | undefined;
} | undefined>;
export {};
