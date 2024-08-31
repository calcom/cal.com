import type { z } from "zod";

import { ZStripeCheckoutSessionInputSchema } from "@calcom/lib/server/repository/stripe";

export { ZStripeCheckoutSessionInputSchema };

export type TStripeCheckoutSessionInputSchema = z.infer<typeof ZStripeCheckoutSessionInputSchema>;
