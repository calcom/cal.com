import { z } from "zod";

export const ZGetOneOffMeetingInputSchema = z.object({
  id: z.string().optional(),
  linkHash: z.string().optional(),
});

export type TGetOneOffMeetingInputSchema = z.infer<typeof ZGetOneOffMeetingInputSchema>;

