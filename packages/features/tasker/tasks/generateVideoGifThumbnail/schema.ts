import { z } from "zod";

export const generateVideoGifThumbnailSchema = z.object({
  recordingId: z.string(),
  downloadUrl: z.string(),
  duration: z.number().optional(),
  calEventId: z.string().optional(),
});

export type GenerateVideoGifThumbnailPayload = z.infer<typeof generateVideoGifThumbnailSchema>;
