import { z } from "zod";

export type TGetAuditLogsInputSchema = {
  bookingUid: string;
};

export const ZGetAuditLogsInputSchema: z.ZodType<TGetAuditLogsInputSchema> = z.object({
  bookingUid: z.string(),
});

