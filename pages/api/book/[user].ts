import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
const {google} = require('googleapis');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const credentials = process.env.GOOGLE_API_CREDENTIALS;
dayjs.extend(utc);
dayjs.extend(timezone);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query;

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
          credentials: true,
          timezone: true,
        }
    });

    authorise(bookEvent);

    // Set up Google API credentials
    function authorise(callback) {
        const {client_secret, client_id, redirect_uris} = JSON.parse(credentials).web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(currentUser.credentials[0].key);
        callback(oAuth2Client);
    }

    function bookEvent(auth) {
        var event = {
            'summary': 'Meeting with ' + req.body.name,
            'description': req.body.notes,
            'start': {
              'dateTime': dayjs(req.body.start).tz(currentUser.timezone).format(),
            },
            'end': {
              'dateTime': dayjs(req.body.end).tz(currentUser.timezone).format(),
            },
            'attendees': [
              {'email': req.body.email},
            ],
            'reminders': {
              'useDefault': false,
              'overrides': [
                {'method': 'email', 'minutes': 60}
              ],
            },
        };

        const calendar = google.calendar({version: 'v3', auth});
        calendar.events.insert({
            auth: auth,
            calendarId: 'primary',
            resource: event,
        }, function(err, event) {
            if (err) {
                console.log('There was an error contacting the Calendar service: ' + err);
                return;
            }
            res.status(200).json({message: 'Event created'});
        });
    }
}