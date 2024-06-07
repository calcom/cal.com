import { z } from "zod";

import { handleErrorsJson } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";
import type { GetRecordingsResponseSchema, GetAccessLinkResponseSchema } from "@calcom/prisma/zod-utils";
import {
  getRecordingsResponseSchema,
  getAccessLinkResponseSchema,
  recordingItemSchema,
} from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoCallData } from "@calcom/types/VideoApiAdapter";

import { ZSubmitBatchProcessorJobRes, ZGetTranscriptAccessLink } from "../zod";
import type { TSubmitBatchProcessorJobRes, TGetTranscriptAccessLink, batchProcessorBody } from "../zod";
import { getDailyAppKeys } from "./getDailyAppKeys";

/** @link https://docs.daily.co/reference/rest-api/rooms/create-room */
const dailyReturnTypeSchema = z.object({
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
  }),
});

const getTranscripts = z.object({
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

const getBatchProcessJobs = z.object({
  total_count: z.number(),
  data: z.array(
    z.object({
      id: z.string(),
      preset: z.string(),
      status: z.string(),
    })
  ),
});

const getRooms = z
  .object({
    id: z.string(),
  })
  .passthrough();

export interface DailyEventResult {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: Record<string, unknown>;
}

export interface DailyVideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

const meetingTokenSchema = z.object({
  token: z.string(),
});

/** @deprecated use metadata on index file */
export const FAKE_DAILY_CREDENTIAL: CredentialPayload & { invalid: boolean } = {
  id: 0,
  type: "daily_video",
  key: { apikey: process.env.DAILY_API_KEY },
  userId: 0,
  user: { email: "" },
  appId: "daily-video",
  invalid: false,
  teamId: null,
};

export const fetcher = async (endpoint: string, init?: RequestInit | undefined) => {
  const { api_key } = await getDailyAppKeys();
  return fetch(`https://api.daily.co/v1${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  }).then(handleErrorsJson);
};

function postToDailyAPI(endpoint: string, body: Record<string, unknown>) {
  return fetcher(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function processTranscriptsInBatches(transcriptIds: Array<string>) {
  const batchSize = 5; // Batch size
  const batches = []; // Array to hold batches of transcript IDs

  // Split transcript IDs into batches
  for (let i = 0; i < transcriptIds.length; i += batchSize) {
    batches.push(transcriptIds.slice(i, i + batchSize));
  }

  const allTranscriptsAccessLinks = []; // Array to hold all access links

  // Process each batch sequentially
  for (const batch of batches) {
    const batchPromises = batch.map((id) =>
      fetcher(`/transcript/${id}/access-link`)
        .then(z.object({ link: z.string() }).parse)
        .then((res) => res.link)
    );

    const accessLinks = await Promise.all(batchPromises);

    allTranscriptsAccessLinks.push(...accessLinks);
  }

  return allTranscriptsAccessLinks;
}

const DailyVideoApiAdapter = (): VideoApiAdapter => {
  async function createOrUpdateMeeting(endpoint: string, event: CalendarEvent): Promise<VideoCallData> {
    if (!event.uid) {
      throw new Error("We need need the booking uid to create the Daily reference in DB");
    }
    const body = await translateEvent(event);
    const dailyEvent = await postToDailyAPI(endpoint, body).then(dailyReturnTypeSchema.parse);
    const meetingToken = await postToDailyAPI("/meeting-tokens", {
      properties: { room_name: dailyEvent.name, exp: dailyEvent.config.exp, is_owner: true },
    }).then(meetingTokenSchema.parse);

    return Promise.resolve({
      type: "daily_video",
      id: dailyEvent.name,
      password: meetingToken.token,
      url: dailyEvent.url,
    });
  }

  const translateEvent = async (event: CalendarEvent) => {
    // Documentation at: https://docs.daily.co/reference#list-rooms
    // Adds 14 days from the end of the booking as the expiration date
    const exp = Math.round(new Date(event.endTime).getTime() / 1000) + 60 * 60 * 24 * 14;
    const { scale_plan: scalePlan } = await getDailyAppKeys();
    const hasTeamPlan = await prisma.membership.findFirst({
      where: {
        userId: event.organizer.id,
        team: {
          slug: {
            not: null,
          },
        },
      },
    });

    return {
      privacy: "public",
      properties: {
        enable_prejoin_ui: true,
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        exp: exp,
        enable_recording: scalePlan === "true" && !!hasTeamPlan === true ? "cloud" : undefined,
        enable_transcription_storage: !!hasTeamPlan,
        ...(!!hasTeamPlan && {
          permissions: {
            canAdmin: ["transcription"],
          },
        }),
      },
    };
  };

  async function createInstantMeeting(endTime: string) {
    // added a 1 hour buffer for room expiration
    const exp = Math.round(new Date(endTime).getTime() / 1000) + 60 * 60;

    const body = {
      privacy: "public",
      properties: {
        enable_prejoin_ui: true,
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        exp: exp,
        enable_recording: "cloud",
        start_video_off: true,
        enable_transcription_storage: true,
      },
    };

    const dailyEvent = await postToDailyAPI("/rooms", body).then(dailyReturnTypeSchema.parse);
    const meetingToken = await postToDailyAPI("/meeting-tokens", {
      properties: { room_name: dailyEvent.name, exp: dailyEvent.config.exp, is_owner: true },
    }).then(meetingTokenSchema.parse);

    return Promise.resolve({
      type: "daily_video",
      id: dailyEvent.name,
      password: meetingToken.token,
      url: dailyEvent.url,
    });
  }

  return {
    /** Daily doesn't need to return busy times, so we return empty */
    getAvailability: () => {
      return Promise.resolve([]);
    },
    createMeeting: async (event: CalendarEvent): Promise<VideoCallData> =>
      createOrUpdateMeeting("/rooms", event),
    deleteMeeting: async (uid: string): Promise<void> => {
      await fetcher(`/rooms/${uid}`, { method: "DELETE" });
      return Promise.resolve();
    },
    updateMeeting: (bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData> =>
      createOrUpdateMeeting(`/rooms/${bookingRef.uid}`, event),
    getRecordings: async (roomName: string): Promise<GetRecordingsResponseSchema> => {
      try {
        const res = await fetcher(`/recordings?room_name=${roomName}`).then(
          getRecordingsResponseSchema.parse
        );
        return Promise.resolve(res);
      } catch (err) {
        throw new Error("Something went wrong! Unable to get recording");
      }
    },
    createInstantCalVideoRoom: (endTime: string) => createInstantMeeting(endTime),
    getRecordingDownloadLink: async (recordingId: string): Promise<GetAccessLinkResponseSchema> => {
      try {
        const res = await fetcher(`/recordings/${recordingId}/access-link?valid_for_secs=43200`).then(
          getAccessLinkResponseSchema.parse
        );
        return Promise.resolve(res);
      } catch (err) {
        console.log("err", err);
        throw new Error("Something went wrong! Unable to get recording access link");
      }
    },
    getAllTranscriptsAccessLinkFromRoomName: async (roomName: string): Promise<Array<string>> => {
      try {
        const res = await fetcher(`/rooms/${roomName}`).then(getRooms.parse);
        const roomId = res.id;
        const allTranscripts = await fetcher(`/transcript?roomId=${roomId}`).then(getTranscripts.parse);

        if (!allTranscripts.data.length) return [];

        const allTranscriptsIds = allTranscripts.data.map((transcript) => transcript.transcriptId);
        const allTranscriptsAccessLink = await processTranscriptsInBatches(allTranscriptsIds);
        const accessLinks = await Promise.all(allTranscriptsAccessLink);

        return Promise.resolve(accessLinks);
      } catch (err) {
        console.log("err", err);
        throw new Error("Something went wrong! Unable to get transcription access link");
      }
    },
    submitBatchProcessorJob: async (body: batchProcessorBody): Promise<TSubmitBatchProcessorJobRes> => {
      try {
        const batchProcessorJob = await postToDailyAPI("/batch-processor", body).then(
          ZSubmitBatchProcessorJobRes.parse
        );
        return batchProcessorJob;
      } catch (err) {
        console.log("err", err);
        throw new Error("Something went wrong! Unable to submit batch processor job");
      }
    },
    getTranscriptsAccessLinkFromRecordingId: async (
      recordingId: string
    ): Promise<TGetTranscriptAccessLink["transcription"] | { message: string }> => {
      try {
        const batchProcessorJobs = await fetcher(`/batch-processor?recordingId=${recordingId}`).then(
          getBatchProcessJobs.parse
        );
        if (!batchProcessorJobs.data.length) {
          return { message: `No Batch processor jobs found for recording id ${recordingId}` };
        }

        const transcriptJobId = batchProcessorJobs.data.filter(
          (job) => job.preset === "transcript" && job.status === "finished"
        )?.[0]?.id;

        if (!transcriptJobId) return [];

        const accessLinkRes = await fetcher(`/batch-processor/${transcriptJobId}/access-link`).then(
          ZGetTranscriptAccessLink.parse
        );

        return accessLinkRes.transcription;
      } catch (err) {
        console.log("err", err);
        throw new Error("Something went wrong! can't get transcripts");
      }
    },
    checkIfRoomNameMatchesInRecording: async (roomName: string, recordingId: string): Promise<boolean> => {
      try {
        const recording = await fetcher(`/recordings/${recordingId}`).then(recordingItemSchema.parse);
        return recording.room_name === roomName;
      } catch (err) {
        console.error("err", err);
        throw new Error(`Something went wrong! Unable to checkIfRoomNameMatchesInRecording. ${err}`);
      }
    },
  };
};

export default DailyVideoApiAdapter;
