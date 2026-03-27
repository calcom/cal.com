import { z } from "zod";

export const AuditTargetTypeSchema = z.enum(["user", "team", "membership", "apiKey", "workflow"]);

export type AuditTargetType = z.infer<typeof AuditTargetTypeSchema>;

export const AuditTargets = Object.fromEntries(
  AuditTargetTypeSchema.options.map((key) => [key, key])
) as { [K in AuditTargetType]: K };
