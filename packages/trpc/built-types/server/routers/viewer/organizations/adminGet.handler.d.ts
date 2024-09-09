import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminGet } from "./adminGet.schema";
type AdminGetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminGet;
};
export declare const adminGetHandler: ({ input }: AdminGetOptions) => Promise<{
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
        isOrganizationConfigured: boolean;
        isOrganizationVerified: boolean;
        orgAutoAcceptEmail: string;
    } | null;
    name: string;
    id: number;
    slug: string | null;
    isOrganization: boolean;
    members: {
        user: {
            name: string | null;
            id: number;
            email: string;
        };
    }[];
}>;
export default adminGetHandler;
