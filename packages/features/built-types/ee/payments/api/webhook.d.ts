/// <reference types="stripe/types/2020-08-27/events" />
import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
export declare const config: {
    api: {
        bodyParser: boolean;
    };
};
export declare function handleStripePaymentSuccess(event: Stripe.Event): Promise<void>;
/**
 * @deprecated
 * We need to create a PaymentManager in `@calcom/core`
 * to prevent circular dependencies on App Store migration
 */
export default function handler(req: NextApiRequest, res: NextApiResponse): Promise<void>;
//# sourceMappingURL=webhook.d.ts.map