import { z } from "zod";

export const ZGetCalVideoRecordingsInputSchema = z.object({
  roomName: z.string(),
});

export type TGetCalVideoRecordingsInputSchema = z.infer<typeof ZGetCalVideoRecordingsInputSchema>;
