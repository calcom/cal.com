import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";
import { getVideoAdapters } from "@calcom/app-store/video-adapter-factory";
import type { GetRecordingsResponseSchema, GetAccessLinkResponseSchema } from "@calcom/prisma/zod-utils";

/**
 * Service for managing video recordings and transcriptions
 * This handles all recording-related functionality for Cal Video
 */

/**
 * Get recordings of Cal Video by room name
 */
export const getRecordingsOfCalVideoByRoomName = async (
  roomName: string
): Promise<GetRecordingsResponseSchema | undefined> => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getRecordings?.(roomName);
};

/**
 * Get download link of Cal Video by recording ID
 */
export const getDownloadLinkOfCalVideoByRecordingId = async (
  recordingId: string
): Promise<GetAccessLinkResponseSchema | undefined> => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getRecordingDownloadLink?.(recordingId);
};

/**
 * Get all transcripts access link from room name
 */
export const getAllTranscriptsAccessLinkFromRoomName = async (roomName: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getAllTranscriptsAccessLinkFromRoomName?.(roomName);
};

/**
 * Get all transcripts access link from meeting ID
 */
export const getAllTranscriptsAccessLinkFromMeetingId = async (meetingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getAllTranscriptsAccessLinkFromMeetingId?.(meetingId);
};

/**
 * Submit batch processor transcription job
 */
export const submitBatchProcessorTranscriptionJob = async (recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.submitBatchProcessorJob?.({
    preset: "transcript",
    inParams: {
      sourceType: "recordingId",
      recordingId: recordingId,
    },
    outParams: {
      s3Config: {
        s3KeyTemplate: "transcript",
      },
    },
  });
};

/**
 * Get transcripts access link from recording ID
 */
export const getTranscriptsAccessLinkFromRecordingId = async (recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.getTranscriptsAccessLinkFromRecordingId?.(recordingId);
};

/**
 * Check if room name matches in recording
 */
export const checkIfRoomNameMatchesInRecording = async (roomName: string, recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.checkIfRoomNameMatchesInRecording?.(roomName, recordingId);
};
