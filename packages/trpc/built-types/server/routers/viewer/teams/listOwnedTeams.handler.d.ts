import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listOwnedTeamsHandler: ({ ctx }: ListOptions) => Promise<{
    name: string;
    id: number;
    createdAt: Date;
    metadata: import(".prisma/client").Prisma.JsonValue;
    timeZone: string;
    slug: string | null;
    parentId: number | null;
    logoUrl: string | null;
    calVideoLogo: string | null;
    appLogo: string | null;
    appIconLogo: string | null;
    bio: string | null;
    hideBranding: boolean;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    bannerUrl: string | null;
    timeFormat: number | null;
    weekStart: string;
    isOrganization: boolean;
    pendingPayment: boolean;
    isPlatform: boolean;
    createdByOAuthClientId: string | null;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
}[] | undefined>;
export {};
