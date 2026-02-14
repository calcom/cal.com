import z from "zod";

export const kasperopayCredentialKeysSchema = z.object({
  merchant_id: z.string(),           // e.g., "kpm_abc123xy"
  webhook_secret: z.string().optional(),        // For verifying incoming webhooks
});
