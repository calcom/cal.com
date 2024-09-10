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
        teamId: number | null;
        secondaryEmailId: number | null;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        expires: Date;
        expiresInDays: number | null;
        identifier: string;
    } | undefined;
    id: number;
    slug: string | null;
    parentId: number | null;
    parent: {
        id: number;
        slug: string | null;
        parentId: number | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
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
    } | null;
    name: string;
    logoUrl: string | null;
    isOrganization: boolean;
    role: import(".prisma/client").$Enums.MembershipRole;
    accepted: boolean;
}[]>;
export default listHandler;
