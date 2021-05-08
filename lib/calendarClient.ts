
const {google} = require('googleapis');
const credentials = process.env.GOOGLE_API_CREDENTIALS;

const googleAuth = () => {
    const {client_secret, client_id, redirect_uris} = JSON.parse(process.env.GOOGLE_API_CREDENTIALS).web;
    return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
};

function handleErrors(response) {
    if (!response.ok) {
        response.json().then( console.log );
        throw Error(response.statusText);
    }
    return response.json();
}


const o365Auth = (credential) => {

    const isExpired = (expiryDate) => expiryDate < +(new Date());

    const refreshAccessToken = (refreshToken) => fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            'scope': 'User.Read Calendars.Read Calendars.ReadWrite',
            'client_id': process.env.MS_GRAPH_CLIENT_ID,
            'refresh_token': refreshToken,
            'grant_type': 'refresh_token',
            'client_secret': process.env.MS_GRAPH_CLIENT_SECRET,
        })
    })
    .then(handleErrors)
    .then( (responseBody) => {
        credential.key.access_token = responseBody.access_token;
        credential.key.expiry_date = Math.round((+(new Date()) / 1000) + responseBody.expires_in);
        return credential.key.access_token;
    })

    return {
        getToken: () => ! isExpired(credential.key.expiry_date) ? Promise.resolve(credential.key.access_token) : refreshAccessToken(credential.key.refresh_token)
    };
};

interface CalendarEvent {
    title: string;
    startTime: string;
    timeZone: string;
    endTime: string;
    description?: string;
    location?: string;
    organizer: { name?: string, email: string };
    attendees: { name?: string, email: string }[];
};

const MicrosoftOffice365Calendar = (credential) => {

    const auth = o365Auth(credential);

    const translateEvent = (event: CalendarEvent) => {

        let optional = {};
        if (event.location) {
            optional.location = { displayName: event.location };
        }

        return {
            subject: event.title,
            body: {
                contentType: 'HTML',
                content: event.description,
            },
            start: {
                dateTime: event.startTime,
                timeZone: event.timeZone,
            },
            end: {
                dateTime: event.endTime,
                timeZone: event.timeZone,
            },
            attendees: event.attendees.map(attendee => ({
                emailAddress: {
                    address: attendee.email,
                    name: attendee.name
                },
                type: "required"
            })),
            ...optional
        }
    };

    return {
        getAvailability: (dateFrom, dateTo) => {
            const payload = {
                schedules: [ credential.key.email ],
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
                .then(handleErrors)
                .then( responseBody => {
                    return responseBody.value[0].scheduleItems.map( (evt) => ({ start: evt.start.dateTime + 'Z', end: evt.end.dateTime + 'Z' }))
                })
            ).catch( (err) => {
                console.log(err);
            });
        },
        createEvent: (event: CalendarEvent) => auth.getToken().then( accessToken => fetch('https://graph.microsoft.com/v1.0/me/calendar/events', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(translateEvent(event))
        }).then(handleErrors))
    }
};

const GoogleCalendar = (credential) => {
    const myGoogleAuth = googleAuth();
    myGoogleAuth.setCredentials(credential.key);
    return {
        getAvailability: (dateFrom, dateTo) => new Promise( (resolve, reject) => {
            const calendar = google.calendar({ version: 'v3', auth: myGoogleAuth });
            calendar.freebusy.query({
                requestBody: {
                    timeMin: dateFrom,
                    timeMax: dateTo,
                    items: [ {
                        "id": "primary"
                    } ]
                }
            }, (err, apires) => {
                if (err) {
                    reject(err);
                }
                resolve(apires.data.calendars.primary.busy)
            });
        }),
        createEvent: (event: CalendarEvent) => new Promise( (resolve, reject) => {
            const payload = {
                summary: event.title,
                description: event.description,
                start: {
                    dateTime: event.startTime,
                    timeZone: event.timeZone,
                },
                end: {
                    dateTime: event.endTime,
                    timeZone: event.timeZone,
                },
                attendees: event.attendees,
                reminders: {
                    useDefault: false,
                    overrides: [
                        {'method': 'email', 'minutes': 60}
                    ],
                },
            };

            if (event.location) {
                payload['location'] = event.location;
            }

            const calendar = google.calendar({version: 'v3', auth: myGoogleAuth });
            calendar.events.insert({
                auth: myGoogleAuth,
                calendarId: 'primary',
                resource: payload,
            }, function(err, event) {
                if (err) {
                    console.log('There was an error contacting the Calendar service: ' + err);
                    return reject(err);
                }
                return resolve(event.data);
            });
        })
    };
};

// factory
const calendars = (withCredentials): [] => withCredentials.map( (cred) => {
    switch(cred.type) {
        case 'google_calendar': return GoogleCalendar(cred);
        case 'office365_calendar': return MicrosoftOffice365Calendar(cred);
        default:
            return; // unknown credential, could be legacy? In any case, ignore
    }
}).filter(Boolean);


const getBusyTimes = (withCredentials, dateFrom, dateTo) => Promise.all(
    calendars(withCredentials).map( c => c.getAvailability(dateFrom, dateTo) )
).then(
    (results) => results.reduce( (acc, availability) => acc.concat(availability) )
);

const createEvent = (credential, evt: CalendarEvent) => calendars([ credential ])[0].createEvent(evt);

export { getBusyTimes, createEvent, CalendarEvent };
