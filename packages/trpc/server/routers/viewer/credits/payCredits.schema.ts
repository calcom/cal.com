import { z } from "zod";

export const ZPayCreditsSchema = z.object({
  quantity: z.number(),
  details: z.string(),
  teamId: z.number().optional(),
  userId: z.number().optional(), // if provided, it is a personal event type
});

export type TPayCreditsSchema = z.infer<typeof ZPayCreditsSchema>;
