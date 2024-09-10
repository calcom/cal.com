import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type ListHandlerInput = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
};
export declare const listHandler: ({ ctx }: ListHandlerInput) => Promise<{
    metadata: {
        requestedSlug?: string | null | undefined;
        paymentId?: string | undefined;
        subscriptionId?: string | null | undefined;
        subscriptionItemId?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    } | null;
    id: number;
    slug: string | null;
    parentId: number | null;
    timeZone: string;
    name: string;
    bio: string | null;
    weekStart: string;
    hideBranding: boolean;
    theme: string | null;
    timeFormat: number | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
    createdAt: Date;
    logoUrl: string | null;
    calVideoLogo: string | null;
    appLogo: string | null;
    appIconLogo: string | null;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    bannerUrl: string | null;
    isOrganization: boolean;
    pendingPayment: boolean;
    isPlatform: boolean;
    createdByOAuthClientId: string | null;
    canAdminImpersonate: boolean;
    organizationSettings: {
        lockEventTypeCreationForUsers: boolean | undefined;
        adminGetsNoSlotsNotification: boolean | undefined;
    };
    user: {
        role: import(".prisma/client").$Enums.MembershipRole;
        accepted: boolean;
    };
}>;
export default listHandler;
