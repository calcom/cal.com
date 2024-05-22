import { z } from "zod";

export const ZUpdateCredentialSettingsInputSchema = z.object({
  credentialId: z.string(),
  settings: z.object({
    toBeDisabled: z.boolean(),
    event: z.string(),
  }),
});

export type TUpdateAppCredentialsInputSchema = z.infer<typeof ZUpdateCredentialSettingsInputSchema>;
