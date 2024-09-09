import type { TrpcSessionUser } from "../../../trpc";
import type { TGetListSchema } from "./list.schema";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetListSchema;
};
export declare const listHandler: ({ ctx, input }: ListOptions) => Promise<{
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
    /** To prevent breaking we only return non-email attached token here, if we have one */
    inviteToken: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        teamId: number | null;
        secondaryEmailId: number | null;
        token: string;
        identifier: string;
        expires: Date;
        expiresInDays: number | null;
    } | undefined;
    name: string;
    id: number;
    slug: string | null;
    parentId: number | null;
    parent: {
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
    } | null;
    logoUrl: string | null;
    isOrganization: boolean;
    role: import(".prisma/client").$Enums.MembershipRole;
    accepted: boolean;
}[]>;
export default listHandler;
