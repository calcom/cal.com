import { z } from "zod";

export const ZScheduleWhatsappMessageInputSchema = z.object({
  calIdTeamId: z.number().optional(),
});

export type TScheduleWhatsappMessageInputSchema = z.infer<typeof ZScheduleWhatsappMessageInputSchema>;