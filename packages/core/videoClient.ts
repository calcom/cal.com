import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import appStore from "@calcom/app-store";
import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";
import { sendBrokenIntegrationEmail } from "@calcom/emails";
import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { GetRecordingsResponseSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { CredentialPayload, CredentialWithAppName } from "@calcom/types/Credential";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoApiAdapterFactory, VideoCallData } from "@calcom/types/VideoApiAdapter";

const log = logger.getChildLogger({ prefix: ["[lib] videoClient"] });

const translator = short();

// factory
const getVideoAdapters = async (withCredentials: CredentialPayload[]): Promise<VideoApiAdapter[]> => {
  const videoAdapters: VideoApiAdapter[] = [];

  for (const cred of withCredentials) {
    const appName = cred.type.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;
    const app = await appStore[appName as keyof typeof appStore];

    if (app && "lib" in app && "VideoApiAdapter" in app.lib) {
      const makeVideoApiAdapter = app.lib.VideoApiAdapter as VideoApiAdapterFactory;
      const videoAdapter = makeVideoApiAdapter(cred);
      videoAdapters.push(videoAdapter);
    }
  }

  return videoAdapters;
};

const getBusyVideoTimes = async (withCredentials: CredentialPayload[]) =>
  Promise.all((await getVideoAdapters(withCredentials)).map((c) => c?.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [] as (EventBusyDate | undefined)[])
  );

const createMeeting = async (credential: CredentialWithAppName, calEvent: CalendarEvent) => {
  const uid: string = getUid(calEvent);

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
  } = {
    appName: credential.appName,
    type: credential.type,
    uid,
    originalEvent: calEvent,
    success: false,
    createdEvent: undefined,
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

    if (!enabledApp?.enabled) throw "Current location app is not enabled";

    createdMeeting = await firstVideoAdapter?.createMeeting(calEvent);

    returnObject = { ...returnObject, createdEvent: createdMeeting, success: true };
  } catch (err) {
    await sendBrokenIntegrationEmail(calEvent, "video");
    console.error("createMeeting failed", err, calEvent);

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
  credential: CredentialWithAppName,
  calEvent: CalendarEvent,
  bookingRef: PartialReference | null
): Promise<EventResult<VideoCallData>> => {
  const uid = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  let success = true;

  const [firstVideoAdapter] = await getVideoAdapters([credential]);
  const updatedMeeting =
    credential && bookingRef
      ? await firstVideoAdapter?.updateMeeting(bookingRef, calEvent).catch(async (e) => {
          await sendBrokenIntegrationEmail(calEvent, "video");
          log.error("updateMeeting failed", e, calEvent);
          success = false;
          return undefined;
        })
      : undefined;

  if (!updatedMeeting) {
    return {
      appName: credential.appName,
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    appName: credential.appName,
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

const deleteMeeting = async (credential: CredentialPayload, uid: string): Promise<unknown> => {
  if (credential) {
    const videoAdapter = (await getVideoAdapters([credential]))[0];
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
      key: dailyAppKeys,
      invalid: false,
    },
  ]);
  return videoAdapter?.createMeeting(calEvent);
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
      key: dailyAppKeys,
      invalid: false,
    },
  ]);
  return videoAdapter?.getRecordingDownloadLink?.(recordingId);
};

export {
  getBusyVideoTimes,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getRecordingsOfCalVideoByRoomName,
  getDownloadLinkOfCalVideoByRecordingId,
};
