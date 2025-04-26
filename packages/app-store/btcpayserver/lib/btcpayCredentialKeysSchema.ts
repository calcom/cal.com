import z from "zod";

export const btcpayCredentialKeysSchema = z.object({
  serverUrl: z.string().optional(),
  storeId: z.string().optional(),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});
