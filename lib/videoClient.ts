import { Credential } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import CalEventParser from "@lib/CalEventParser";
import "@lib/emails/EventMail";
import { getIntegrationName } from "@lib/emails/helpers";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";

import { AdditionInformation, CalendarEvent, EntryPoint } from "./calendarClient";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";
import DailyVideoApiAdapter from "./integrations/Daily/DailyVideoApiAdapter";
import ZoomVideoApiAdapter from "./integrations/Zoom/ZoomVideoApiAdapter";
import { Ensure } from "./types/utils";

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
  createMeeting(event: CalendarEvent): Promise<any>;

  updateMeeting(uid: string, event: CalendarEvent): Promise<any>;

  deleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom?: string, dateTo?: string): Promise<EventBusyDate[]>;
}

// factory
const getVideoAdapters = (withCredentials: Credential[]): VideoApiAdapter[] =>
  withCredentials.reduce<VideoApiAdapter[]>((acc, cred) => {
    switch (cred.type) {
      case "zoom_video":
        acc.push(ZoomVideoApiAdapter(cred));
        break;
      case "daily_video":
        acc.push(DailyVideoApiAdapter(cred));
        break;
      default:
        break;
    }
    return acc;
  }, []);

const getBusyVideoTimes: (withCredentials: Credential[]) => Promise<unknown[]> = (withCredentials) =>
  Promise.all(getVideoAdapters(withCredentials).map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );

const createMeeting = async (
  credential: Credential,
  calEvent: Ensure<CalendarEvent, "language">
): Promise<EventResult> => {
  const parser: CalEventParser = new CalEventParser(calEvent);
  const uid: string = parser.getUid();

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const videoAdapters = getVideoAdapters([credential]);
  const [firstVideoAdapter] = videoAdapters;
  const createdMeeting = await firstVideoAdapter.createMeeting(calEvent).catch((e) => {
    log.error("createMeeting failed", e, calEvent);
    success = false;
  });

  if (!createdMeeting) {
    return {
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  const videoCallData: VideoCallData = {
    type: credential.type,
    id: createdMeeting.id,
    password: createdMeeting.password,
    url: createdMeeting.join_url,
  };

  if (credential.type === "daily_video") {
    videoCallData.type = "Daily.co Video";
    videoCallData.id = createdMeeting.name;
    videoCallData.url = process.env.BASE_URL + "/call/" + uid;
  }

  const entryPoint: EntryPoint = {
    entryPointType: getIntegrationName(videoCallData),
    uri: videoCallData.url,
    label: calEvent.language("enter_meeting"),
    pin: videoCallData.password,
  };

  const additionInformation: AdditionInformation = {
    entryPoints: [entryPoint],
  };

  calEvent.additionInformation = additionInformation;
  calEvent.videoCallData = videoCallData;

  try {
    const organizerMail = new VideoEventOrganizerMail(calEvent);
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!createdMeeting || !createdMeeting.disableConfirmationEmail) {
    try {
      const attendeeMail = new VideoEventAttendeeMail(calEvent);
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: credential.type,
    success,
    uid,
    createdEvent: createdMeeting,
    originalEvent: calEvent,
    videoCallData: videoCallData,
  };
};

const updateMeeting = async (
  credential: Credential,
  calEvent: CalendarEvent,
  bookingRefUid: string | null
): Promise<EventResult> => {
  const uid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const [firstVideoAdapter] = getVideoAdapters([credential]);
  const updatedMeeting =
    credential && bookingRefUid
      ? await firstVideoAdapter.updateMeeting(bookingRefUid, calEvent).catch((e) => {
          log.error("updateMeeting failed", e, calEvent);
          success = false;
          return undefined;
        })
      : undefined;

  if (!updatedMeeting) {
    return {
      type: credential.type,
      success,
      uid,
      originalEvent: calEvent,
    };
  }

  try {
    const organizerMail = new EventOrganizerRescheduledMail(calEvent);
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!updatedMeeting.disableConfirmationEmail) {
    try {
      const attendeeMail = new EventAttendeeRescheduledMail(calEvent);
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: credential.type,
    success,
    uid,
    updatedEvent: updatedMeeting,
    originalEvent: calEvent,
  };
};

const deleteMeeting = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    return getVideoAdapters([credential])[0].deleteMeeting(uid);
  }

  return Promise.resolve({});
};

export { getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting };
