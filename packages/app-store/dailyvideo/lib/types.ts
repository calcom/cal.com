import { z } from "zod";

/** @link https://docs.daily.co/reference/rest-api/rooms/create-room */
export const dailyReturnTypeSchema = z.object({
  /** Long UID string ie: 987b5eb5-d116-4a4e-8e2c-14fcb5710966 */
  id: z.string(),
  /** Not a real name, just a random generated string ie: "ePR84NQ1bPigp79dDezz" */
  name: z.string(),
  api_created: z.boolean(),
  privacy: z.union([z.literal("private"), z.literal("public")]),
  /** https://api-demo.daily.co/ePR84NQ1bPigp79dDezz */
  url: z.string(),
  created_at: z.string(),
  config: z.object({
    /** Timestamps expressed in seconds, not in milliseconds */
    nbf: z.number().optional(),
    /** Timestamps expressed in seconds, not in milliseconds */
    exp: z.number(),
    enable_chat: z.boolean(),
    enable_knocking: z.boolean(),
    enable_prejoin_ui: z.boolean(),
    enable_transcription_storage: z.boolean().default(false),
    enable_pip_ui: z.boolean(),
  }),
});

export const getTranscripts = z.object({
  total_count: z.number(),
  data: z.array(
    z.object({
      transcriptId: z.string(),
      domainId: z.string(),
      roomId: z.string(),
      mtgSessionId: z.string(),
      duration: z.number(),
      status: z.string(),
    })
  ),
});

export const getBatchProcessJobs = z.object({
  total_count: z.number(),
  data: z.array(
    z.object({
      id: z.string(),
      preset: z.string(),
      status: z.string(),
    })
  ),
});

export const getRooms = z
  .object({
    id: z.string(),
  })
  .passthrough();

export const meetingTokenSchema = z
  .object({
    token: z.string(),
  })
  .passthrough();

export const ZGetMeetingTokenResponseSchema = z
  .object({
    room_name: z.string(),
    exp: z.number(),
    enable_recording_ui: z.boolean().optional(),
    user_id: z.number().nullable().optional(),
  })
  .passthrough();
