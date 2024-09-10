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
    id: number;
    slug: string | null;
    name: string;
    organizationSettings: {
        id: number;
        isOrganizationVerified: boolean;
        isOrganizationConfigured: boolean;
        isAdminReviewed: boolean;
        orgAutoAcceptEmail: string;
        isAdminAPIEnabled: boolean;
        organizationId: number;
        lockEventTypeCreationForUsers: boolean;
        adminGetsNoSlotsNotification: boolean;
    } | null;
    members: {
        user: {
            id: number;
            name: string | null;
            email: string;
        };
    }[];
}[]>;
export default adminGetUnverifiedHandler;
