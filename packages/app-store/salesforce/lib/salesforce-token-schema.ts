import { z } from "zod";

export const salesforceTokenSchema = z.object({
  id: z.string(),
  issued_at: z.string(),
  instance_url: z.string(),
  signature: z.string(),
  access_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
  token_lifetime: z.number().optional(),
});
