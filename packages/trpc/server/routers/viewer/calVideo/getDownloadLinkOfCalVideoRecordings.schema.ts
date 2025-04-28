import { z } from "zod";

export const ZGetDownloadLinkOfCalVideoRecordingsInputSchema = z.object({
  recordingId: z.string(),
});

export type TGetDownloadLinkOfCalVideoRecordingsInputSchema = z.infer<
  typeof ZGetDownloadLinkOfCalVideoRecordingsInputSchema
>;
