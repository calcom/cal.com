import z from "zod";

export const btcpayCredentialKeysSchema = z.object({
  serverUrl: z.string().url(),
  storeId: z.string(),
  apiKey: z.string(),
  webhookSecret: z.string(),
});
