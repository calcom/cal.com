import { Prisma } from "@prisma/client";
import Stripe from "stripe";
export declare function getStripeCustomerIdFromUserId(userId: number): Promise<string>;
declare const userType: {
    select: {
        email: true;
        metadata: true;
    };
};
export type UserType = Prisma.UserGetPayload<typeof userType>;
/** This will retrieve the customer ID from Stripe or create it if it doesn't exists yet. */
export declare function getStripeCustomerId(user: UserType): Promise<string>;
export declare const stripe: Stripe;
export {};
//# sourceMappingURL=stripe.d.ts.map