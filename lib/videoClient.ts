/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { v5 as uuidv5 } from "uuid";
import * as jwt from "jsonwebtoken";
import moment from "moment-timezone";

import prisma from "./prisma";
import { CalendarEvent } from "./calendarClient";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import short from "short-uuid";
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";
import { Prisma } from ".prisma/client";
import { parseTokenPayload } from "./auth";
import { createUrlMeeting, deleteMeetingMSTeam } from "./amili/videoClient";

const translator = short();

export interface VideoCallData {
  type: string;
  id: string;
  password: string;
  url: string;
}

interface IKeyCredentials {
  expires_in: string;
  scope: string;
  token_type: string;
  access_token: string;
  refresh_token: string;
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

const wait = (delay: number) => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

const fetchRetry = (url: string, delay: number, tries: number, fetchOptions = {}) => {
  const onError = (err) => {
    const numOfRetries = tries - 1;

    if (!numOfRetries) {
      throw err;
    }
    return wait(delay).then(() => fetchRetry(url, delay, numOfRetries, fetchOptions));
  };
  return fetch(url, fetchOptions).catch(onError);
};

const zoomAuth = async (credential) => {
  const isExpired = (expiryDate) => expiryDate < +(new Date().getTime() / 1000);

  const newCredential = await prisma.credential.findFirst({ where: { id: credential.id } });

  const { expires_in, access_token, refresh_token } = newCredential.key as unknown as IKeyCredentials;

  console.log({ isExpired: isExpired(expires_in) });
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;

  const generateNewToken = async (apiKey, apiSecret, cre) => {
    const newToken = jwt.sign({ aud: null }, apiSecret, {
      algorithm: "HS256",
      expiresIn: "604800000",
      issuer: apiKey,
    });

    const payload = jwt.verify(newToken, apiSecret, { algorithms: ["HS256"] });

    await prisma.credential.update({
      where: {
        id: cre.id,
      },
      data: {
        key: { expires_in: payload.exp, access_token: newToken, refresh_token: newToken },
      },
    });

    return newToken;
  };

  let token = access_token;

  if (isExpired(expires_in)) {
    token = await generateNewToken(apiKey, apiSecret, newCredential);
  }

  return {
    getToken: () => Promise.resolve(token),
  };
};

interface VideoApiAdapter {
  createMeeting(event: CalendarEvent): Promise<any>;

  updateMeeting(uid: string, event: CalendarEvent);

  deleteMeeting(uid: string);

  getAvailability(dateFrom, dateTo): Promise<any>;

  getMeetingById(uid: string): Promise<any>;
}

const ZoomVideo = (credential): VideoApiAdapter => {
  const auth = zoomAuth(credential);

  const translateEvent = (event: CalendarEvent) => {
    const tz = event.attendees[0].timeZone;
    const newStartTime = moment(event.startTime).tz(tz).format("YYYY-MM-DDTHH:mm:ss");
    const newEndTime = moment(event.endTime).tz(tz).format("YYYY-MM-DDTHH:mm:ss");
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    const eventTranslated = {
      topic: event.title,
      type: 2, // Means that this is a scheduled meeting
      start_time: newStartTime,
      duration: (new Date(newEndTime).getTime() - new Date(event.startTime).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.attendees[0].timeZone,
      //password: "string",       TODO: Should we use a password? Maybe generate a random one?
      agenda: event.description,
      default_password: true,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false, // TODO: true if host meeting in China
        in_meeting: false, // TODO: true if host meeting in India
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: "none",
        enforce_login: false,
        waiting_room: false,
        registrants_email_notification: true,
      },
    };

    // console.log({ eventTranslated });

    return eventTranslated;
  };

  return {
    getAvailability: async (dateFrom, dateTo) => {
      return (await auth)
        .getToken()
        .then(
          // TODO Possibly implement pagination for cases when there are more than 300 meetings already scheduled.
          (accessToken) =>
            fetchRetry("https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300", 1000, 5, {
              method: "get",
              headers: {
                Authorization: "Bearer " + accessToken,
              },
            })
              .then(handleErrorsJson)
              .then((responseBody) => {
                return responseBody.meetings.map((meeting) => ({
                  start: meeting.start_time,
                  end: new Date(
                    new Date(meeting.start_time).getTime() + meeting.duration * 60000
                  ).toISOString(),
                }));
              })
        )
        .catch((err) => {
          console.log({ err });
        });
    },
    createMeeting: async (event: CalendarEvent) =>
      (await auth).getToken().then((accessToken) =>
        fetchRetry("https://api.zoom.us/v2/users/me/meetings", 1000, 5, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsJson)
      ),
    deleteMeeting: async (uid: string) =>
      (await auth).getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/meetings/" + uid, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + accessToken,
          },
        }).then(handleErrorsRaw)
      ),
    updateMeeting: async (uid: string, event: CalendarEvent) =>
      (await auth).getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/meetings/" + uid, {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(translateEvent(event)),
        }).then(handleErrorsRaw)
      ),
    getMeetingById: async (uid: string) =>
      (await auth).getToken().then((accessToken) =>
        fetch("https://api.zoom.us/v2/meetings/" + uid, {
          method: "GET",
          headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json",
          },
        }).then(handleErrorsRaw)
      ),
  };
};

// factory
const videoIntegrations = (withCredentials): VideoApiAdapter[] =>
  withCredentials
    .map((cred) => {
      switch (cred.type) {
        case "zoom_video":
          return ZoomVideo(cred);
        case "office365_video":
          return deleteMeetingMSTeam();
        default:
          return; // unknown credential, could be legacy? In any case, ignore
      }
    })
    .filter(Boolean);

const getBusyVideoTimes = (withCredentials, dateFrom, dateTo) =>
  Promise.all(videoIntegrations(withCredentials).map((c) => c.getAvailability(dateFrom, dateTo))).then(
    (results) => results.reduce((acc, availability) => acc.concat(availability), [])
  );

const createMeeting = async (credential, calEvent: CalendarEvent): Promise<any> => {
  const uid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const creationResult = await videoIntegrations([credential])[0].createMeeting(calEvent);

  const videoCallData: VideoCallData = {
    type: credential.type,
    id: creationResult.id,
    password: creationResult.password,
    url: creationResult.join_url,
  };

  const organizerMail = new VideoEventOrganizerMail(calEvent, uid, videoCallData);
  const attendeeMail = new VideoEventAttendeeMail(calEvent, uid, videoCallData);
  // try {
  //   await organizerMail.sendEmail();
  // } catch (e) {
  //   console.error("organizerMail.sendEmail failed", e);
  // }

  // if (!creationResult || !creationResult.disableConfirmationEmail) {
  //   try {
  //     await attendeeMail.sendEmail();
  //   } catch (e) {
  //     console.error("attendeeMail.sendEmail failed", e);
  //   }
  // }

  return {
    uid,
    createdEvent: creationResult,
  };
};

const updateMeeting = async (credential, uidToUpdate: string, calEvent: CalendarEvent): Promise<any> => {
  const newUid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error(
      "Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set."
    );
  }

  const updateResult = await createUrlMeeting(credential, calEvent).catch((e) => {
    console.error("createMeeting failed", e, calEvent);
  });

  // const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  // const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  // try {
  //   await organizerMail.sendEmail();
  // } catch (e) {
  //   console.error("organizerMail.sendEmail failed", e);
  // }

  // if (!updateResult || !updateResult.disableConfirmationEmail) {
  //   try {
  //     await attendeeMail.sendEmail();
  //   } catch (e) {
  //     console.error("attendeeMail.sendEmail failed", e);
  //   }
  // }

  return {
    uid: newUid,
    updatedEvent: updateResult,
  };
};

const deleteMeeting = (credential, uid: string): Promise<any> => {
  if (credential) {
    // return videoIntegrations([credential])[0].deleteMeeting(uid);
    switch (credential.type) {
      case "office365_video":
        return deleteMeetingMSTeam();
      default:
        return; // unknown credential, could be legacy? In any case, ignore
    }
  }

  return Promise.resolve({});
};

const getMeeting = (credential, uid: string): Promise<any> => {
  if (credential) {
    return videoIntegrations([credential])[0].getMeetingById(uid);
  }

  return Promise.resolve({});
};

export { getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting, getMeeting };
