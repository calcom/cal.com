import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import appStore from "@calcom/app-store";
import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";
import { sendBrokenIntegrationEmail } from "@calcom/emails";
import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { getPiiFreeCalendarEvent, getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import type { GetRecordingsResponseSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoApiAdapterFactory, VideoCallData } from "@calcom/types/VideoApiAdapter";

const log = logger.getSubLogger({ prefix: ["[lib] videoClient"] });

const translator = short();

// factory
const getVideoAdapters = async (withCredentials: CredentialPayload[]): Promise<VideoApiAdapter[]> => {
  const videoAdapters: VideoApiAdapter[] = [];

  for (const cred of withCredentials) {
    const appName = cred.type.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;
    log.silly("Getting video adapter for", safeStringify({ appName, cred: getPiiFreeCredential(cred) }));
    const appImportFn = appStore[appName as keyof typeof appStore];

    // Static Link Video Apps don't exist in packages/app-store/index.ts(it's manually maintained at the moment) and they aren't needed there anyway.
    const app = appImportFn ? await appImportFn() : null;

    if (!app) {
      log.error(`Couldn't get adapter for ${appName}`);
      continue;
    }

    if ("lib" in app && "VideoApiAdapter" in app.lib) {
      const makeVideoApiAdapter = app.lib.VideoApiAdapter as VideoApiAdapterFactory;
      const videoAdapter = makeVideoApiAdapter(cred);
      videoAdapters.push(videoAdapter);
    } else {
      log.error(`App ${appName} doesn't have 'lib.VideoApiAdapter' defined`);
    }
  }

  return videoAdapters;
};

const getBusyVideoTimes = async (withCredentials: CredentialPayload[]) =>
  Promise.all((await getVideoAdapters(withCredentials)).map((c) => c?.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [] as (EventBusyDate | undefined)[])
  );

const createMeeting = async (credential: CredentialPayload, calEvent: CalendarEvent) => {
  const uid: string = getUid(calEvent);
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
    appName: credential.appId || "",
    type: credential.type,
    uid,
    originalEvent: calEvent,
    success: false,
    createdEvent: undefined,
    credentialId: credential.id,
  };
  try {
    // Check to see if video app is enabled
    const enabledApp = await prisma.app.findFirst({
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
      calEvent.location = "integrations:dailyvideo";
    }

    returnObject = { ...returnObject, createdEvent: defaultMeeting };
  }

  return returnObject;
};

const updateMeeting = async (
  credential: CredentialPayload,
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
      appName: credential.appId || "",
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    appName: credential.appId || "",
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

const deleteMeeting = async (credential: CredentialPayload | null, uid: string): Promise<unknown> => {
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
  } catch (e) {
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
    },
  ]);
  return videoAdapter?.createMeeting(calEvent);
};

export const createInstantMeetingWithCalVideo = async (endTime: string) => {
  let dailyAppKeys: Awaited<ReturnType<typeof getDailyAppKeys>>;
  try {
    dailyAppKeys = await getDailyAppKeys();
  } catch (e) {
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
    },
  ]);
  return videoAdapter?.getRecordings?.(roomName);
};

const getDownloadLinkOfCalVideoByRecordingId = async (recordingId: string) => {
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
    },
  ]);
  return videoAdapter?.getRecordingDownloadLink?.(recordingId);
};

const getAllTranscriptsAccessLinkFromRoomName = async (roomName: string) => {
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
    },
  ]);
  return videoAdapter?.getAllTranscriptsAccessLinkFromRoomName?.(roomName);
};

export {
  getBusyVideoTimes,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
  getAllTranscriptsAccessLinkFromRoomName,
};
