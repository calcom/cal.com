import { z } from "zod";

export const googleSheetsCredentialSchema = z.object({
  key: z.object({
    type: z.string(),
    project_id: z.string(),
    private_key_id: z.string(),
    private_key: z.string(),
    client_email: z.string(),
    client_id: z.string(),
    auth_uri: z.string(),
    token_uri: z.string(),
    auth_provider_x509_cert_url: z.string(),
    client_x509_cert_url: z.string(),
  }),
  scope: z.string(),
});

export type GoogleSheetsCredentialData = z.infer<typeof googleSheetsCredentialSchema>;
