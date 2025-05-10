import { z } from "zod";

export const ZIsAvailableInputSchema = z.object({
  slots: z.array(
    z.object({
      utcStartIso: z.string(),
      utcEndIso: z.string(),
    })
  ),
  eventTypeId: z.number().int(),
});

export type TIsAvailableInputSchema = z.infer<typeof ZIsAvailableInputSchema>;

export const ZIsAvailableOutputSchema = z.object({
  slots: z.array(
    z.object({
      utcStartIso: z.string(),
      utcEndIso: z.string(),
      status: z.enum(["available", "reserved", "minBookNoticeViolation", "slotInPast"]),
      realStatus: z.enum(["available", "reserved", "minBookNoticeViolation", "slotInPast"]).optional(),
    })
  ),
});

export type TIsAvailableOutputSchema = z.infer<typeof ZIsAvailableOutputSchema>;
