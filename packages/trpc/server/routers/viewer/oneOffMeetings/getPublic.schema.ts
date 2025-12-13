import { z } from "zod";

export const ZGetPublicOneOffMeetingInputSchema = z.object({
  linkHash: z.string(),
});

export type TGetPublicOneOffMeetingInputSchema = z.infer<typeof ZGetPublicOneOffMeetingInputSchema>;

