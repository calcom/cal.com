import { z } from "zod";

export const sendDunningEmailSchema = z.object({
  teamId: z.number().int().positive(),
});
