import { z } from "zod";

export const AuditSourceSchema = z.enum([
  "API_V1",
  "API_V2",
  "WEBAPP",
  "WEBHOOK",
  "SYSTEM",
  "MAGIC_LINK",
  "SAML",
  "OAUTH",
  "UNKNOWN",
]);

export type AuditSource = z.infer<typeof AuditSourceSchema>;

// Excludes UNKNOWN — callers should always pass an explicit source
export const ValidAuditSourceSchema = AuditSourceSchema.exclude(["UNKNOWN"]);

export type ValidAuditSource = z.infer<typeof ValidAuditSourceSchema>;

export const AuditSources = Object.fromEntries(
  AuditSourceSchema.options.map((key) => [key, key])
) as { [K in AuditSource]: K };
