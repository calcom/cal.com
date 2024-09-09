import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type VerifyCodeOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const getBrandHandler: ({ ctx }: VerifyCodeOptions) => Promise<{
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
    slug: string;
    fullDomain: string;
    domainSuffix: string;
    name: string;
    logoUrl: string | null;
    isPlatform: boolean;
} | null>;
export default getBrandHandler;
