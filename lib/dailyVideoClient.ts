import { Credential } from "@prisma/client";
import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import CalEventParser from "@lib/CalEventParser";
import { AdditionInformation, EntryPoint } from "@lib/emails/EventMail";
import { getIntegrationName } from "@lib/emails/helpers";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";

import { CalendarEvent } from "./calendarClient";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";

const log = logger.getChildLogger({ prefix: ["[lib] dailyVideoClient"] });

const translator = short();

export interface DailyVideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

function handleErrorsJson(response) {
  if (!response.ok) {
    response.json().then(console.log);
    throw Error(response.statusText);
  }
  return response.json();
}

const dailyCredential = process.env.DAILY_API_KEY;

interface DailyVideoApiAdapter {
  dailyCreateMeeting(event: CalendarEvent): Promise<any>;

  dailyUpdateMeeting(uid: string, event: CalendarEvent);

  dailyDeleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom, dateTo): Promise<any>;
}

const DailyVideo = (credential): DailyVideoApiAdapter => {
  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://docs.daily.co/reference#list-rooms
    // added a 1 hour buffer for room expiration and room entry
    const exp = Math.round(new Date(event.endTime).getTime() / 1000) + 60 * 60;
    const nbf = Math.round(new Date(event.startTime).getTime() / 1000) - 60 * 60;
    return {
      privacy: "private",
      properties: {
        enable_new_call_ui: true,
        enable_prejoin_ui: true,
        enable_knocking: true,
        enable_screenshare: true,
        enable_chat: true,
        exp: exp,
        nbf: nbf,
      },
    };
  };

  return {
    getAvailability: () => {
      return credential;
    },
    dailyCreateMeeting: (event: CalendarEvent) =>
      fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + dailyCredential,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translateEvent(event)),
      }).then(handleErrorsJson),
    dailyDeleteMeeting: (uid: string) =>
      fetch("https://api.daily.co/v1/rooms/" + uid, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + dailyCredential,
        },
      }).then(handleErrorsJson),
    dailyUpdateMeeting: (uid: string, event: CalendarEvent) =>
      fetch("https://api.daily.co/v1/rooms/" + uid, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + dailyCredential,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(translateEvent(event)),
      }).then(handleErrorsJson),
  };
};

// factory
const videoIntegrations = (withCredentials): DailyVideoApiAdapter[] =>
  withCredentials
    .map((cred) => {
      return DailyVideo(cred);
    })
    .filter(Boolean);

const getBusyVideoTimes: (withCredentials) => Promise<unknown[]> = (withCredentials) =>
  Promise.all(videoIntegrations(withCredentials).map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );

const dailyCreateMeeting = async (
  credential: Credential,
  calEvent: CalendarEvent,
  maybeUid: string = null
): Promise<EventResult> => {
  const parser: CalEventParser = new CalEventParser(calEvent, maybeUid);
  const uid: string = parser.getUid();

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const creationResult = await videoIntegrations([credential])[0]
    .dailyCreateMeeting(calEvent)
    .catch((e) => {
      log.error("createMeeting failed", e, calEvent);
      success = false;
    });

  const currentRoute = process.env.BASE_URL;

  const videoCallData: DailyVideoCallData = {
    type: "Daily.co Video",
    id: creationResult.name,
    password: creationResult.password,
    url: currentRoute + "/call/" + uid,
  };

  const entryPoint: EntryPoint = {
    entryPointType: getIntegrationName(videoCallData),
    uri: videoCallData.url,
    label: "Enter Meeting",
    pin: "",
  };

  const additionInformation: AdditionInformation = {
    entryPoints: [entryPoint],
  };

  const organizerMail = new VideoEventOrganizerMail(calEvent, uid, videoCallData, additionInformation);
  const attendeeMail = new VideoEventAttendeeMail(calEvent, uid, videoCallData, additionInformation);

  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!creationResult || !creationResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: "daily",
    success,
    uid,
    createdEvent: creationResult,
    originalEvent: calEvent,
  };
};

const dailyUpdateMeeting = async (
  credential: Credential,
  uidToUpdate: string,
  calEvent: CalendarEvent
): Promise<EventResult> => {
  const newUid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  let success = true;

  const updateResult = credential
    ? await videoIntegrations([credential])[0]
        .dailyUpdateMeeting(uidToUpdate, calEvent)
        .catch((e) => {
          log.error("updateMeeting failed", e, calEvent);
          success = false;
        })
    : null;

  const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e);
  }

  if (!updateResult || !updateResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e);
    }
  }

  return {
    type: credential.type,
    success,
    uid: newUid,
    updatedEvent: updateResult,
    originalEvent: calEvent,
  };
};

const dailyDeleteMeeting = (credential: Credential, uid: string): Promise<unknown> => {
  if (credential) {
    return videoIntegrations([credential])[0].dailyDeleteMeeting(uid);
  }

  return Promise.resolve({});
};

export { getBusyVideoTimes, dailyCreateMeeting, dailyUpdateMeeting, dailyDeleteMeeting };
