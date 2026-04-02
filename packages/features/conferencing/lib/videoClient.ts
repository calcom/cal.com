import { DailyLocationType } from "@calcom/app-store/constants";
import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";
import { getVideoAdapters } from "@calcom/app-store/getVideoAdapters";
import { sendBrokenIntegrationEmail } from "@calcom/emails/integration-email-service";
import { getUid } from "@calcom/lib/CalEventParser";
import { CAL_VIDEO, CAL_VIDEO_TYPE } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { GetAccessLinkResponseSchema, GetRecordingsResponseSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialForCalendarService, CredentialPayload } from "@calcom/types/Credential";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import type { VideoCallData } from "@calcom/types/VideoApiAdapter";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

const log = logger.getSubLogger({ prefix: ["[features/conferencing/lib] videoClient"] });

const translator = short();

const getBusyVideoTimes = async (withCredentials: CredentialPayload[]) =>
  Promise.all((await getVideoAdapters(withCredentials)).map((c) => c?.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [] as (EventBusyDate | undefined)[])
  );

const createMeeting = async (
  credential: CredentialPayload | CredentialForCalendarService,
  calEvent: CalendarEvent
) => {
  const uid: string = getUid(calEvent.uid);
  log.debug(
    "createMeeting",
    safeStringify({
      credential: getPiiFreeCredential(credential),
      uid,
      calEvent: getPiiFreeCalendarEvent(calEvent),
    })
  );
  if (!credential || !credential.appId) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const videoAdapters = await getVideoAdapters([credential]);
  const [firstVideoAdapter] = videoAdapters;
  let createdMeeting;
  let returnObject: {
    appName: string;
    type: string;
    uid: string;
    originalEvent: CalendarEvent;
    success: boolean;
    createdEvent: VideoCallData | undefined;
    credentialId: number;
  } = {
    appName: credential.appName || credential.appId || "",
    type: credential.type,
    uid,
    originalEvent: calEvent,
    success: false,
    createdEvent: undefined,
    credentialId: credential.id,
  };
  try {
    // Check to see if video app is enabled
    const enabledApp = await prisma.app.findUnique({
      where: {
        slug: credential.appId,
      },
      select: {
        enabled: true,
      },
    });

    if (!enabledApp?.enabled)
      throw `Location app ${credential.appId} is either disabled or not seeded at all`;

    createdMeeting = await firstVideoAdapter?.createMeeting(calEvent);

    returnObject = { ...returnObject, createdEvent: createdMeeting, success: true };
    log.debug("created Meeting", safeStringify(returnObject));
  } catch (err) {
    await sendBrokenIntegrationEmail(calEvent, "video");
    log.error(
      "createMeeting failed",
      safeStringify(err),
      safeStringify({ calEvent: getPiiFreeCalendarEvent(calEvent) })
    );
    // Default to calVideo
    const defaultMeeting = await createMeetingWithCalVideo(calEvent);
    if (defaultMeeting) {
      calEvent.location = DailyLocationType;
    }

    returnObject = { ...returnObject, originalEvent: calEvent, createdEvent: defaultMeeting };
  }

  return returnObject;
};

const updateMeeting = async (
  credential: CredentialPayload | CredentialForCalendarService,
  calEvent: CalendarEvent,
  bookingRef: PartialReference | null
): Promise<EventResult<VideoCallData>> => {
  const uid = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));
  let success = true;
  const [firstVideoAdapter] = await getVideoAdapters([credential]);
  const canCallUpdateMeeting = !!(credential && bookingRef);
  const updatedMeeting = canCallUpdateMeeting
    ? await firstVideoAdapter?.updateMeeting(bookingRef, calEvent).catch(async (e) => {
        await sendBrokenIntegrationEmail(calEvent, "video");
        log.error("updateMeeting failed", e, calEvent);
        success = false;
        return undefined;
      })
    : undefined;

  if (!updatedMeeting) {
    log.error(
      "updateMeeting failed",
      safeStringify({ bookingRef, canCallUpdateMeeting, calEvent, credential })
    );
    return {
      appName: credential.appName || credential.appId || "",
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    appName: credential.appName || credential.appId || "",
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

const deleteMeeting = async (
  credential: CredentialPayload | CredentialForCalendarService | null,
  uid: string
): Promise<unknown> => {
  if (credential) {
    const videoAdapter = (await getVideoAdapters([credential]))[0];
    log.debug(
      "Calling deleteMeeting for",
      safeStringify({ credential: getPiiFreeCredential(credential), uid })
    );
    // There are certain video apps with no video adapter defined. e.g. riverby,whereby
    if (videoAdapter) {
      return videoAdapter.deleteMeeting(uid);
    }
  }

  return Promise.resolve({});
};

// @TODO: This is a temporary solution to create a meeting with cal.com video as fallback url
const createMeetingWithCalVideo = async (calEvent: CalendarEvent) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.createMeeting(calEvent);
};

export const createInstantMeetingWithCalVideo = async (endTime: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.createInstantCalVideoRoom?.(endTime);
};

const getRecordingsOfCalVideoByRoomName = async (
  roomName: string
): Promise<GetRecordingsResponseSchema | undefined> => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getRecordings?.(roomName);
};

const getDownloadLinkOfCalVideoByRecordingId = async (
  recordingId: string
): Promise<GetAccessLinkResponseSchema | undefined> => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getRecordingDownloadLink?.(recordingId);
};

const getAllTranscriptsAccessLinkFromRoomName = async (roomName: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getAllTranscriptsAccessLinkFromRoomName?.(roomName);
};

const getAllTranscriptsAccessLinkFromMeetingId = async (meetingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);
  return videoAdapter?.getAllTranscriptsAccessLinkFromMeetingId?.(meetingId);
};

const submitBatchProcessorTranscriptionJob = async (recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
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

const getTranscriptsAccessLinkFromRecordingId = async (recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.getTranscriptsAccessLinkFromRecordingId?.(recordingId);
};

const checkIfRoomNameMatchesInRecording = async (roomName: string, recordingId: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch {
    console.error("Error: Cal video provider is not installed.");
    return;
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.checkIfRoomNameMatchesInRecording?.(roomName, recordingId);
};

const getCalVideoMeetingSessionsByRoomName = async (roomName: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
    console.error("Error: Cal video provider is not installed.");
    return { data: [] };
  }
  const [videoAdapter] = await getVideoAdapters([
    {
      id: 0,
      appId: CAL_VIDEO,
      type: CAL_VIDEO_TYPE,
      userId: null,
      user: { email: "" },
      teamId: null,
      key: dailyAppKeys,
      encryptedKey: null,
      invalid: false,
      delegationCredentialId: null,
    },
  ]);

  return videoAdapter?.getMeetingInformation?.(roomName) ?? { data: [] };
};

export {
  getBusyVideoTimes,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
  getAllTranscriptsAccessLinkFromRoomName,
  getAllTranscriptsAccessLinkFromMeetingId,
  submitBatchProcessorTranscriptionJob,
  getTranscriptsAccessLinkFromRecordingId,
  checkIfRoomNameMatchesInRecording,
  getCalVideoMeetingSessionsByRoomName,
};
