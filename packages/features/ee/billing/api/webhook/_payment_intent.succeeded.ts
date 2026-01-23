import logger from "@calcom/lib/logger";

import type { SWHMap } from "../../lib/types";

const log = logger.getSubLogger({ prefix: ["stripe-webhook-payment-intent-succeeded"] });

// This is a placeholder to showcase adding new event handlers
const handler = async (data: SWHMap["payment_intent.succeeded"]["data"]) => {
  const paymentIntent = data.object;
  log.info("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
  // TODO: Implement payment intent succeeded webhook handler
  return { success: true };
};

export default handler;
