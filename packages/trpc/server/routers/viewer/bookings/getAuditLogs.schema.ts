import { z } from "zod";

export const ZGetAuditLogsInputSchema = z.object({
    bookingUid: z.string(),
});

export type TGetAuditLogsInputSchema = z.infer<typeof ZGetAuditLogsInputSchema>;

