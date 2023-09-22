import type { Invoice } from "@getalby/sdk/dist/types";
import { Webhook } from "svix";

export default function parseInvoice(
  body: string,
  headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
  },
  webhookEndpointSecret: string
): Invoice {
  const wh = new Webhook(webhookEndpointSecret);
  return wh.verify(body, headers) as Invoice;
}
