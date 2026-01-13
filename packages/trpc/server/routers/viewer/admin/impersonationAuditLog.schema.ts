import { z } from "zod";

export const ZImpersonationAuditLogSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().nullish(),
});

export type TImpersonationAuditLogSchema = z.infer<typeof ZImpersonationAuditLogSchema>;
