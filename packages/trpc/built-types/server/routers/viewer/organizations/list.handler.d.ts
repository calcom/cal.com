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
    name: string;
    id: number;
    createdAt: Date;
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
