import { z } from "zod";

export const ZDeleteCalVideoRecordingInputSchema = z.object({
  recordingId: z.string(),
  roomName: z.string(),
});

export type TDeleteCalVideoRecordingInputSchema = z.infer<typeof ZDeleteCalVideoRecordingInputSchema>;
