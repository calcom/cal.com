import type { TrpcSessionUser } from "../../../trpc";
type AdminGetAllOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const adminGetUnverifiedHandler: ({}: AdminGetAllOptions) => Promise<{
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
    organizationSettings: {
        id: number;
        organizationId: number;
        isOrganizationConfigured: boolean;
        isOrganizationVerified: boolean;
        orgAutoAcceptEmail: string;
        lockEventTypeCreationForUsers: boolean;
        adminGetsNoSlotsNotification: boolean;
        isAdminReviewed: boolean;
        isAdminAPIEnabled: boolean;
    } | null;
    name: string;
    id: number;
    slug: string | null;
    members: {
        user: {
            name: string | null;
            id: number;
            email: string;
        };
    }[];
}[]>;
export default adminGetUnverifiedHandler;
