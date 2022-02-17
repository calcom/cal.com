import { InstalledApp } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getUid } from "@lib/CalEventParser";
import { EventResult } from "@lib/events/EventManager";
import { PartialReference } from "@lib/events/EventManager";
import Huddle01VideoApiAdapter from "@lib/integrations/Huddle01/Huddle01VideoApiAdapter";
import JitsiVideoApiAdapter from "@lib/integrations/Jitsi/JitsiVideoApiAdapter";
import logger from "@lib/logger";

import DailyVideoApiAdapter from "./integrations/Daily/DailyVideoApiAdapter";
import TandemVideoApiAdapter from "./integrations/Tandem/TandemVideoApiAdapter";
import ZoomVideoApiAdapter from "./integrations/Zoom/ZoomVideoApiAdapter";
import { CalendarEvent } from "./integrations/calendar/interfaces/Calendar";

const log = logger.getChildLogger({ prefix: ["[lib] videoClient"] });

const translator = short();

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

type EventBusyDate = Record<"start" | "end", Date>;

export interface VideoApiAdapter {
  createMeeting(event: CalendarEvent): Promise<VideoCallData>;

  updateMeeting(bookingRef: PartialReference, event: CalendarEvent): Promise<VideoCallData>;

  deleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;
}

// factory
const getVideoAdapters = (withInstalledApps: InstalledApp[]): VideoApiAdapter[] =>
  withInstalledApps.reduce<VideoApiAdapter[]>((acc, cred) => {
    switch (cred.type) {
      case "zoom_video":
        acc.push(ZoomVideoApiAdapter(cred));
        break;
      case "daily_video":
        acc.push(DailyVideoApiAdapter(cred));
        break;
      case "jitsi_video":
        acc.push(JitsiVideoApiAdapter());
        break;
      case "huddle01_video":
        acc.push(Huddle01VideoApiAdapter());
        break;
      case "tandem_video":
        acc.push(TandemVideoApiAdapter(cred));
        break;
      default:
        break;
    }
    return acc;
  }, []);

const getBusyVideoTimes = (withInstalledApps: InstalledApp[]) =>
  Promise.all(getVideoAdapters(withInstalledApps).map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );

const createMeeting = async (installedApp: InstalledApp, calEvent: CalendarEvent): Promise<EventResult> => {
  const uid: string = getUid(calEvent);

  if (!installedApp) {
    throw new Error(
      "The App must be set! Video platforms are optional, so this method shouldn't even be called when no video installed apps are set."
    );
  }

  const videoAdapters = getVideoAdapters([installedApp]);
  const [firstVideoAdapter] = videoAdapters;
  const createdMeeting = await firstVideoAdapter.createMeeting(calEvent).catch((e) => {
    log.error("createMeeting failed", e, calEvent);
  });

  if (!createdMeeting) {
    return {
      type: installedApp.type,
      success: false,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    type: installedApp.type,
    success: true,
    uid,
    createdEvent: createdMeeting,
    originalEvent: calEvent,
  };
};

const updateMeeting = async (
  installedApp: InstalledApp,
  calEvent: CalendarEvent,
  bookingRef: PartialReference | null
): Promise<EventResult> => {
  const uid = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  let success = true;

  const [firstVideoAdapter] = getVideoAdapters([installedApp]);
  const updatedMeeting =
    installedApp && bookingRef
      ? await firstVideoAdapter.updateMeeting(bookingRef, calEvent).catch((e) => {
          log.error("updateMeeting failed", e, calEvent);
          success = false;
          return undefined;
        })
      : undefined;

  if (!updatedMeeting) {
    return {
      type: installedApp.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  return {
    type: installedApp.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

const deleteMeeting = (installedApp: InstalledApp, uid: string): Promise<unknown> => {
  if (installedApp) {
    return getVideoAdapters([installedApp])[0].deleteMeeting(uid);
  }

  return Promise.resolve({});
};

export { getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting };
