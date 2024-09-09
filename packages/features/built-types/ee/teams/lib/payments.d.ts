/// <reference types="stripe/types/2020-08-27/checkout/sessions" />
/// <reference types="stripe/types/2020-08-27/subscriptions" />
import type Stripe from "stripe";
import { BillingPeriod } from "@calcom/prisma/zod-utils";
/** Used to prevent double charges for the same team */
export declare const checkIfTeamPaymentRequired: ({ teamId }: {
    teamId?: number | undefined;
}) => Promise<{
    url: null;
} | {
    url: string;
}>;
/**
 * Used to generate a checkout session when trying to create a team
 */
export declare const generateTeamCheckoutSession: ({ teamName, teamSlug, userId, }: {
    teamName: string;
    teamSlug: string;
    userId: number;
}) => Promise<Stripe.Response<Stripe.Checkout.Session>>;
/**
 * Used to generate a checkout session when creating a new org (parent team) or backwards compatibility for old teams
 */
export declare const purchaseTeamOrOrgSubscription: (input: {
    teamId: number;
    /**
     * The actual number of seats in the team.
     * The seats that we would charge for could be more than this depending on the MINIMUM_NUMBER_OF_ORG_SEATS in case of an organization
     * For a team it would be the same as this value
     */
    seatsUsed: number;
    /**
     * If provided, this is the exact number we would charge for.
     */
    seatsToChargeFor?: number | null | undefined;
    userId: number;
    isOrg?: boolean | undefined;
    pricePerSeat: number | null;
    billingPeriod?: BillingPeriod | undefined;
}) => Promise<{
    url: string | null;
}>;
export declare const getTeamWithPaymentMetadata: (teamId: number) => Promise<{
    metadata: {
        paymentId: string;
        subscriptionId: string;
        subscriptionItemId: string;
        orgSeats?: number | null | undefined;
    };
    isOrganization: boolean;
    members: {
        id: number;
        userId: number;
        teamId: number;
        role: import(".prisma/client").$Enums.MembershipRole;
        disableImpersonation: boolean;
        accepted: boolean;
    }[];
}>;
export declare const cancelTeamSubscriptionFromStripe: (teamId: number) => Promise<Stripe.Response<Stripe.Subscription> | undefined>;
export declare const updateQuantitySubscriptionFromStripe: (teamId: number) => Promise<void>;
//# sourceMappingURL=payments.d.ts.map