import { z } from "zod";

export const ZDeleteOneOffMeetingInputSchema = z.object({
  id: z.string(),
});

export type TDeleteOneOffMeetingInputSchema = z.infer<typeof ZDeleteOneOffMeetingInputSchema>;

