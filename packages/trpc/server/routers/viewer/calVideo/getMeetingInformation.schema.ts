import { z } from "zod";

export const ZGetMeetingInformationInputSchema = z.object({
  roomName: z.string(),
});

export type TGetMeetingInformationInputSchema = z.infer<typeof ZGetMeetingInformationInputSchema>;
