import { z } from "zod";

export const appKeysSchema = z.object({
  api_key: z.string().min(1),
  scale_plan: z.string().default("false"),
});

export const appDataSchema = z.object({});

export const ZSubmitBatchProcessorJobRes = z.object({
  id: z.string(),
});

export type TSubmitBatchProcessorJobRes = z.infer<typeof ZSubmitBatchProcessorJobRes>;

export type batchProcessorBody = {
  preset: "transcript";
  inParams: {
    sourceType: "recordingId";
    recordingId: string;
  };
  outParams: {
    s3Config: {
      s3KeyTemplate: "transcript";
    };
  };
};

export const ZGetTranscriptAccessLink = z.object({
  id: z.string(),
  preset: z.string(),
  status: z.string(),
  transcription: z.array(
    z.object({
      format: z.string(),
      link: z.string().url(),
    })
  ),
});

export type TGetTranscriptAccessLink = z.infer<typeof ZGetTranscriptAccessLink>;

export const ZGetDailyWebhooks = z.array(
  z
    .object({
      uuid: z.string(),
      url: z.string().url(),
      hmac: z.string(),
      eventTypes: z.array(z.string()),
      state: z.string(),
      failedCount: z.number(),
    })
    .passthrough()
);

export type TGetDailyWebhooks = z.infer<typeof ZGetDailyWebhooks>;
