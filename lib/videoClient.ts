import prisma from "./prisma";
import {CalendarEvent} from "./calendarClient";
import VideoEventOrganizerMail from "./emails/VideoEventOrganizerMail";
import VideoEventAttendeeMail from "./emails/VideoEventAttendeeMail";
import {v5 as uuidv5} from 'uuid';
import short from 'short-uuid';
import EventAttendeeRescheduledMail from "./emails/EventAttendeeRescheduledMail";
import EventOrganizerRescheduledMail from "./emails/EventOrganizerRescheduledMail";

const translator = short();

export interface VideoCallData {
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

const zoomAuth = (credential) => {

  const isExpired = (expiryDate) => expiryDate < +(new Date());
  const authHeader = 'Basic ' + Buffer.from(process.env.ZOOM_CLIENT_ID + ':' + process.env.ZOOM_CLIENT_SECRET).toString('base64');

  const refreshAccessToken = (refreshToken) => fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'refresh_token': refreshToken,
      'grant_type': 'refresh_token',
    })
  })
    .then(handleErrorsJson)
    .then(async (responseBody) => {
      // Store new tokens in database.
      await prisma.credential.update({
        where: {
          id: credential.id
        },
        data: {
          key: responseBody
        }
      });
      credential.key.access_token = responseBody.access_token;
      credential.key.expires_in = Math.round((+(new Date()) / 1000) + responseBody.expires_in);
      return credential.key.access_token;
    })

  return {
    getToken: () => !isExpired(credential.key.expires_in) ? Promise.resolve(credential.key.access_token) : refreshAccessToken(credential.key.refresh_token)
  };
};

interface VideoApiAdapter {
  createMeeting(event: CalendarEvent): Promise<any>;

  updateMeeting(uid: String, event: CalendarEvent);

  deleteMeeting(uid: String);

  getAvailability(dateFrom, dateTo): Promise<any>;
}

const ZoomVideo = (credential): VideoApiAdapter => {

  const auth = zoomAuth(credential);

  const translateEvent = (event: CalendarEvent) => {
    // Documentation at: https://marketplace.zoom.us/docs/api-reference/zoom-api/meetings/meetingcreate
    return {
      topic: event.title,
      type: 2,    // Means that this is a scheduled meeting
      start_time: event.startTime,
      duration: ((new Date(event.endTime)).getTime() - (new Date(event.startTime)).getTime()) / 60000,
      //schedule_for: "string",   TODO: Used when scheduling the meeting for someone else (needed?)
      timezone: event.attendees[0].timeZone,
      //password: "string",       TODO: Should we use a password? Maybe generate a random one?
      agenda: event.description,
      settings: {
        host_video: true,
        participant_video: true,
        cn_meeting: false,  // TODO: true if host meeting in China
        in_meeting: false,  // TODO: true if host meeting in India
        join_before_host: true,
        mute_upon_entry: false,
        watermark: false,
        use_pmi: false,
        approval_type: 2,
        audio: "both",
        auto_recording: "none",
        enforce_login: false,
        registrants_email_notification: true
      }
    };
  };

  return {
    getAvailability: (dateFrom, dateTo) => {
      return auth.getToken().then(
        // TODO Possibly implement pagination for cases when there are more than 300 meetings already scheduled.
        (accessToken) => fetch('https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300', {
          method: 'get',
          headers: {
            'Authorization': 'Bearer ' + accessToken
          }
        })
          .then(handleErrorsJson)
          .then(responseBody => {
            return responseBody.meetings.map((meeting) => ({
              start: meeting.start_time,
              end: (new Date((new Date(meeting.start_time)).getTime() + meeting.duration * 60000)).toISOString()
            }))
          })
      ).catch((err) => {
        console.log(err);
      });
    },
    createMeeting: (event: CalendarEvent) => auth.getToken().then(accessToken => fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(translateEvent(event))
    }).then(handleErrorsJson)),
    deleteMeeting: (uid: String) => auth.getToken().then(accessToken => fetch('https://api.zoom.us/v2/meetings/' + uid, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + accessToken
      }
    }).then(handleErrorsRaw)),
    updateMeeting: (uid: String, event: CalendarEvent) => auth.getToken().then(accessToken => fetch('https://api.zoom.us/v2/meetings/' + uid, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(translateEvent(event))
    }).then(handleErrorsRaw)),
  }
};

// factory
const videoIntegrations = (withCredentials): VideoApiAdapter[] => withCredentials.map((cred) => {
  switch (cred.type) {
    case 'zoom_video':
      return ZoomVideo(cred);
    default:
      return; // unknown credential, could be legacy? In any case, ignore
  }
}).filter(Boolean);


const getBusyVideoTimes = (withCredentials, dateFrom, dateTo) => Promise.all(
  videoIntegrations(withCredentials).map(c => c.getAvailability(dateFrom, dateTo))
).then(
  (results) => results.reduce((acc, availability) => acc.concat(availability), [])
);

const createMeeting = async (credential, calEvent: CalendarEvent): Promise<any> => {
  const uid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error("Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set.");
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
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e)
  }

  if (!creationResult || !creationResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e)
    }
  }

  return {
    uid,
    createdEvent: creationResult
  };
};

const updateMeeting = async (credential, uidToUpdate: String, calEvent: CalendarEvent): Promise<any> => {
  const newUid: string = translator.fromUUID(uuidv5(JSON.stringify(calEvent), uuidv5.URL));

  if (!credential) {
    throw new Error("Credentials must be set! Video platforms are optional, so this method shouldn't even be called when no video credentials are set.");
  }

  const updateResult = credential ? await videoIntegrations([credential])[0].updateMeeting(uidToUpdate, calEvent) : null;

  const organizerMail = new EventOrganizerRescheduledMail(calEvent, newUid);
  const attendeeMail = new EventAttendeeRescheduledMail(calEvent, newUid);
  try {
    await organizerMail.sendEmail();
  } catch (e) {
    console.error("organizerMail.sendEmail failed", e)
  }

  if (!updateResult || !updateResult.disableConfirmationEmail) {
    try {
      await attendeeMail.sendEmail();
    } catch (e) {
      console.error("attendeeMail.sendEmail failed", e)
    }
  }

  return {
    uid: newUid,
    updatedEvent: updateResult
  };
};

const deleteMeeting = (credential, uid: String): Promise<any> => {
  if (credential) {
    return videoIntegrations([credential])[0].deleteMeeting(uid);
  }

  return Promise.resolve({});
};

export {getBusyVideoTimes, createMeeting, updateMeeting, deleteMeeting};
