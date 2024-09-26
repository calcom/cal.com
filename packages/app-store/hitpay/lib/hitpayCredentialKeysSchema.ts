import z from "zod";

export const hitpayCredentialKeysSchema = z.object({
  api_key: z.string(),
  salt_key: z.string(),
  webhook_endpoint_id: z.string(),
  webhook_endpoint_name: z.string(),
  webhook_endpoint_url: z.string(),
  webhook_endpoint_business_id: z.string(),
  webhook_endpoint_salt: z.string(),
});
