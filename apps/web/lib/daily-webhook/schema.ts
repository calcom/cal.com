import { z } from "zod";

const commonSchema = z
  .object({
    version: z.string(),
    type: z.string(),
    id: z.string(),
    event_ts: z.number().optional(),
  })
  .passthrough();

export const meetingEndedSchema = commonSchema.extend({
  payload: z
    .object({
      meeting_id: z.string(),
      end_ts: z.number().optional(),
      room: z.string(),
      start_ts: z.number().optional(),
    })
    .passthrough(),
});

export const recordingReadySchema = commonSchema.extend({
  payload: z.object({
    recording_id: z.string(),
    end_ts: z.number().optional(),
    room_name: z.string(),
    start_ts: z.number().optional(),
    status: z.string(),

    max_participants: z.number().optional(),
    duration: z.number().optional(),
    s3_key: z.string().optional(),
  }),
});

export const batchProcessorJobFinishedSchema = commonSchema.extend({
  payload: z
    .object({
      id: z.string(),
      status: z.string(),
      input: z.object({
        sourceType: z.string(),
        recordingId: z.string(),
      }),
      output: z
        .object({
          transcription: z.array(z.object({ format: z.string() }).passthrough()),
        })
        .passthrough(),
    })
    .passthrough(),
});

export type TBatchProcessorJobFinished = z.infer<typeof batchProcessorJobFinishedSchema>;

export const downloadLinkSchema = z.object({
  download_link: z.string(),
});

export const testRequestSchema = z.object({
  test: z.enum(["test"]),
});
