import { z } from "zod";

export const ZOutOfOfficeInputSchema = z
  .object({
    uuid: z.string().nullish(),
    forUserId: z.number().nullish(),
    dateRange: z.object({
      startDate: z.date(),
      endDate: z.date(),
    }),
    startDateOffset: z.number(),
    endDateOffset: z.number(),
    toTeamUserId: z.number().nullable(),
    reasonId: z.number().optional(),
    notes: z.string().nullable().optional(),
    showNotePublicly: z.boolean().optional(),
    customReason: z.string().max(100).optional(),
    customEmoji: z.string().max(10).optional(),
  })
  .refine((data) => data.reasonId || data.customReason, {
    message: "Either reasonId or customReason is required",
    path: ["reasonId"],
  });

export type TOutOfOfficeInputSchema = z.infer<typeof ZOutOfOfficeInputSchema>;
