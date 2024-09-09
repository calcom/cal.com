import type { Invoice } from "@getalby/sdk/dist/types";
export default function parseInvoice(body: string, headers: {
    "svix-id": string;
    "svix-timestamp": string;
    "svix-signature": string;
}, webhookEndpointSecret: string): Invoice | null;
//# sourceMappingURL=parseInvoice.d.ts.map