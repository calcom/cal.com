import { type InvalidAppCredentialBannerProps } from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type checkInvalidAppCredentialsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const checkInvalidAppCredentials: ({ ctx }: checkInvalidAppCredentialsOptions) => Promise<InvalidAppCredentialBannerProps[]>;
export {};
