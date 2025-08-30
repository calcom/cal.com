import z from "zod";

export const albyCredentialKeysSchema = z.object({
  account_id: z.string(),
  account_email: z.string(),
  account_lightning_address: z.string(),
  webhook_endpoint_id: z.string(),
  webhook_endpoint_secret: z.string(),
});
