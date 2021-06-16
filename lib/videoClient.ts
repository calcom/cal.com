import prisma from "./prisma";
import {VideoCallData} from "./emails/confirm-booked";
import {CalendarEvent} from "./calendarClient";
import VideoEventOwnerMail from "./emails/VideoEventOwnerMail";

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
            /*const payload = {
                schedules: [credential.key.email],
                startTime: {
                    dateTime: dateFrom,
                    timeZone: 'UTC',
                },
                endTime: {
                    dateTime: dateTo,
                    timeZone: 'UTC',
                },
                availabilityViewInterval: 60
            };

            return auth.getToken().then(
                (accessToken) => fetch('https://graph.microsoft.com/v1.0/me/calendar/getSchedule', {
                    method: 'post',
                    headers: {
                        'Authorization': 'Bearer ' + accessToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })
                    .then(handleErrorsJson)
                    .then(responseBody => {
                        return responseBody.value[0].scheduleItems.map((evt) => ({
                            start: evt.start.dateTime + 'Z',
                            end: evt.end.dateTime + 'Z'
                        }))
                    })
            ).catch((err) => {
                console.log(err);
            });*/
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


const getBusyTimes = (withCredentials, dateFrom, dateTo) => Promise.all(
  videoIntegrations(withCredentials).map(c => c.getAvailability(dateFrom, dateTo))
).then(
    (results) => results.reduce((acc, availability) => acc.concat(availability), [])
);

const createMeeting = async (credential, calEvent: CalendarEvent): Promise<any> => {
    if(!credential) {
        throw new Error("Credentials must be set! Video platforms are optional, so this method shouldn't even be called.");
    }

    const creationResult = await videoIntegrations([credential])[0].createMeeting(calEvent);

    const videoCallData: VideoCallData = {
        type: credential.type,
        id: creationResult.id,
        password: creationResult.password,
        url: creationResult.join_url,
    };

    const mail = new VideoEventOwnerMail(calEvent, videoCallData);
    const sentMail = await mail.sendEmail();

    return {
        createdEvent: creationResult,
        sentMail: sentMail
    };
};

const updateMeeting = (credential, uid: String, event: CalendarEvent): Promise<any> => {
    if (credential) {
        return videoIntegrations([credential])[0].updateMeeting(uid, event);
    }

    return Promise.resolve({});
};

const deleteMeeting = (credential, uid: String): Promise<any> => {
    if (credential) {
        return videoIntegrations([credential])[0].deleteMeeting(uid);
    }

    return Promise.resolve({});
};

export {getBusyTimes, createMeeting, updateMeeting, deleteMeeting};
