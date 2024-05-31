import { z } from "zod";

export const appKeysSchema = z.object({
  apiKey: z.string().min(1),
  projectId: z.string().min(1),
  endpoint: z.string().min(1),
});

export type AppKeys = z.infer<typeof appKeysSchema>;

export const appDataSchema = z.object({});

export const credentialSettingsSchema = z.object({
  disabledEvents: z.array(z.string()),
  templateSetup: z.boolean(),
});

export type CredentialSettings = z.infer<typeof credentialSettingsSchema>;
