import type { Invoice } from "@getalby/sdk/dist/types";
import { Webhook } from "svix";

import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["alby", "parseInvoice"] });

export default function parseInvoice(
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
  webhookEndpointSecret: string
): Invoice | null {
  try {
    const wh = new Webhook(webhookEndpointSecret);
    return wh.verify(body, headers) as Invoice;
  } catch (err) {
    // Looks like alby might sent multiple webhooks for the same invoice but it should only work once
    // TODO: remove the Alby webhook when uninstalling the Alby app
    log.error("Failed to verify alby webhook signature", err);
  }
  return null;
}
