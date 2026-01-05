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

const meetingParticipantSchema = z.object({
  user_id: z.string().nullable(),
  participant_id: z.string(),
  user_name: z.string().nullable(),
  join_time: z.number(),
  duration: z.number(),
});

const meetingSessionSchema = z.object({
  id: z.string(),
  room: z.string(),
  start_time: z.number(),
  duration: z.number(),
  ongoing: z.boolean(),
  max_participants: z.number(),
  participants: z.array(meetingParticipantSchema),
});

export const getMeetingInformationResponseSchema = z.object({
  data: z.array(meetingSessionSchema),
});

export type CalMeetingParticipant = z.infer<typeof meetingParticipantSchema>;
export type CalMeetingSession = z.infer<typeof meetingSessionSchema>;
export type TGetMeetingInformationResponsesSchema = z.infer<typeof getMeetingInformationResponseSchema>;

export type TGetTranscriptAccessLink = z.infer<typeof ZGetTranscriptAccessLink>;
