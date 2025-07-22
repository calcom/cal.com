import z from "zod";

// App keys schema for LawPay credentials
export const appKeysSchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  public_key: z.string().min(1),
  secret_key: z.string().min(1),
  merchant_id: z.string().min(1),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

// App data schema for LawPay settings
export const appDataSchema = z.object({
  enabled: z.boolean().optional(),
  credentialId: z.number().optional(),
  appCategories: z.array(z.string()).optional(),
  price: z.number(),
  currency: z.string(),
  paymentOption: z.string().optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  public_key: z.string().optional(),
  secret_key: z.string().optional(),
  merchant_id: z.string().optional(),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
  webhook_secret: z.string().optional(),
});

export type AppKeysSchema = z.infer<typeof appKeysSchema>;
