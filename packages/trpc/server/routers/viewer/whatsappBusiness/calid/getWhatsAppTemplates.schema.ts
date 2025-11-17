import { z } from "zod";

export const ZCalidGetWhatsAppTemplatesInputSchema = z.object({
  phoneNumberId: z.string(),
  calIdTeamId: z.number().optional(),
});
