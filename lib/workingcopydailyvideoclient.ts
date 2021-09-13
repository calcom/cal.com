import prisma from "./prisma";
import { CalendarEvent } from "./calendarClient";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import { v5 as uuidv5 } from "uuid";
import short from "short-uuid";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import { EventResult } from "@lib/events/EventManager";
import logger from "@lib/logger";
import { AdditionInformation, EntryPoint } from "@lib/emails/EventMail";
import { getIntegrationName } from "@lib/emails/helpers";
import CalEventParser from "@lib/CalEventParser";
import { Credential } from "@prisma/client";

const log = logger.getChildLogger({ prefix: ["[lib] dailyVideoClient"] });

const translator = short();

const daily2credential : Credential =  {
  id:6736,
  type:"daily_video",
  key: {apikey: process.env.DAILY_API_KEY},
  userId: 1

}


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

function handleErrorsRaw(response) {
  if (!response.ok) {
    response.text().then(console.log);
    throw Error(response.statusText);
  }
  return response.text();
}

var dailyCredential = process.env.DAILY_API_KEY


//lola internal - we can probably do later but we might want to follow this for the meetingToken piece
const zoomAuth = (credential) => {
  const isExpired = (expiryDate) => expiryDate < +new Date();
  const authHeader =
    "Basic " +
    Buffer.from(process.env.ZOOM_CLIENT_ID + ":" + process.env.ZOOM_CLIENT_SECRET).toString("base64");

  const refreshAccessToken = (refreshToken) =>
    fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })
      .then(handleErrorsJson)
      .then(async (responseBody) => {
        // Store new tokens in database.
        await prisma.credential.update({
          where: {
            id: credential.id,
          },
          data: {
            key: responseBody,
          },
        });
        credential.key.access_token = responseBody.access_token;
        credential.key.expires_in = Math.round(+new Date() / 1000 + responseBody.expires_in);
        return credential.key.access_token;
      });

  return {
    getToken: () =>
      !isExpired(credential.key.expires_in)
        ? Promise.resolve(credential.key.access_token)
        : refreshAccessToken(credential.key.refresh_token),
  };
};

interface DailyVideoApiAdapter {
  dailyCreateMeeting(event: CalendarEvent): Promise<any>;

  dailyUpdateMeeting(uid: string, event: CalendarEvent);

  dailyDeleteMeeting(uid: string): Promise<unknown>;

  getAvailability(dateFrom, dateTo): Promise<any>;
}

const DailyVideo = (credential): DailyVideoApiAdapter => {
  // lola todo yea this zoom auth stuff

  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://docs.daily.co/reference#list-rooms
    // lola todo i'll need to actually pull in the dynamic data but I think I can draw inspiration from the zoom translate event
    return {
      privacy: "public",
      properties: {
        enable_new_call_ui: true,
        enable_prejoin_ui: true, 
        enable_knocking: true,  
        enable_screenshare: true,
        enable_chat: true
      }
    };
  };

  return {
    getAvailability: () => {
      return credential;
    },
    dailyCreateMeeting: (event: CalendarEvent) => fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + dailyCredential,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(translateEvent(event))
    }).then(handleErrorsJson),
    dailyDeleteMeeting: (uid: String) => fetch('https://api.daily.co/v1/rooms/' + uid, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + dailyCredential,
      }
    }).then(handleErrorsRaw),
    dailyUpdateMeeting: (uid: String, event: CalendarEvent) => fetch('https://api.daily.co/v1/rooms/' + uid, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + dailyCredential,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(translateEvent(event))
    }).then(handleErrorsRaw),
  };
};

// factory
const videoIntegrations = (withCredentials): DailyVideoApiAdapter[] =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "daily_video":
          return DailyVideo(cred);
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);

const getBusyVideoTimes: (withCredentials) => Promise<unknown[]> = (withCredentials) =>
  Promise.all(videoIntegrations(withCredentials).map((c) => c.getAvailability())).then((results) =>
    results.reduce((acc, availability) => acc.concat(availability), [])
  );

  //lola internal i changed credential to dailycredential
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

  const videoCallData: DailyVideoCallData = {
    type: "Daily Video Chat & Conferencing",
    id: creationResult.name,
    password: creationResult.password,
    url: creationResult.url,
  };

  //lola todo - we probably don't need an entry point
  const entryPoint: EntryPoint = {
    entryPointType: getIntegrationName(videoCallData),
    uri: videoCallData.url,
    label: "Enter Meeting",
    pin: "",
  };

  const additionInformation: AdditionInformation = {
    entryPoints: [entryPoint],
  };

  //lola todo - this is where i'll need different things for organizer mail
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
