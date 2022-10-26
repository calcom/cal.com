import { Credential } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import appStore from "@calcom/app-store";
import { getDailyAppKeys } from "@calcom/app-store/dailyvideo/lib/getDailyAppKeys";
import type { ExtendedCredential } from "@calcom/core/EventManager";
import { sendBrokenIntegrationEmail } from "@calcom/emails";
import { getUid } from "@calcom/lib/CalEventParser";
import logger from "@calcom/lib/logger";
import type { CalendarEvent, EventBusyDate } from "@calcom/types/Calendar";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";
import type { VideoApiAdapter, VideoApiAdapterFactory, VideoCallData } from "@calcom/types/VideoApiAdapter";

const log = logger.getChildLogger({ prefix: ["[lib] videoClient"] });

const translator = short();

// factory
const getVideoAdapters = (withCredentials: Credential[]): VideoApiAdapter[] =>
  withCredentials.reduce<VideoApiAdapter[]>((acc, cred) => {
    const appName = cred.type.split("_").join(""); // Transform `zoom_video` to `zoomvideo`;
    const app = appStore[appName as keyof typeof appStore];
    if (app && "lib" in app && "VideoApiAdapter" in app.lib) {
      const makeVideoApiAdapter = app.lib.VideoApiAdapter as VideoApiAdapterFactory;
      const videoAdapter = makeVideoApiAdapter(cred);
      acc.push(videoAdapter);
      return acc;
    }
    return acc;
  }, []);

const getBusyVideoTimes = (withCredentials: Credential[]) =>
  Promise.all(getVideoAdapters(withCredentials).map((c) => c?.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [] as (EventBusyDate | undefined)[])
  );

const createMeeting = async (credential: ExtendedCredential, calEvent: CalendarEvent) => {
  const uid: string = getUid(calEvent);

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const videoAdapters = getVideoAdapters([credential]);
  const [firstVideoAdapter] = videoAdapters;
  let createdMeeting;
  try {
    createdMeeting = await firstVideoAdapter?.createMeeting(calEvent);

    if (!createdMeeting) {
      return {
        appName: credential.appName,
        type: credential.type,
        success: false,
        uid,
        originalEvent: calEvent,
      };
    }
  } catch (err) {
    await sendBrokenIntegrationEmail(calEvent, "video");
    console.error("createMeeting failed", err, calEvent);

    // Default to calVideo
    const defaultMeeting = await createMeetingWithCalVideo(calEvent);
    if (defaultMeeting) {
      createdMeeting = defaultMeeting;
      calEvent.location = "integrations:dailyvideo";
    }
  }

  return {
    appName: credential.appName,
    type: credential.type,
    success: true,
    uid,
    createdEvent: createdMeeting,
    originalEvent: calEvent,
  };
};

const updateMeeting = async (
  credential: ExtendedCredential,
  calEvent: CalendarEvent,
  bookingRef: PartialReference | null
): Promise<EventResult<VideoCallData>> => {
  const uid = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  let success = true;

  const [firstVideoAdapter] = getVideoAdapters([credential]);
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

const deleteMeeting = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    const videoAdapter = getVideoAdapters([credential])[0];
    // There are certain video apps with no video adapter defined. e.g. riverby,whereby
    if (videoAdapter) {
      return videoAdapter.deleteMeeting(uid);
    }
  }

  return Promise.resolve({});
};

// @TODO: This is a temporary solution to create a meeting with cal.com video as fallback url
const createMeetingWithCalVideo = async (calEvent: CalendarEvent) => {
  const [videoAdapter] = getVideoAdapters([
    {
      id: 0,
      appId: "daily-video",
      type: "daily_video",
      userId: null,
      key: await getDailyAppKeys(),
    },
  ]);
  return videoAdapter?.createMeeting(calEvent);
};

export { getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting };
