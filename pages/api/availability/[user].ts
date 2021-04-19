import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
const {google} = require('googleapis');

const credentials = process.env.GOOGLE_API_CREDENTIALS;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true
        }
    });

    let availability = [];

    authorise(getAvailability)

    // Set up Google API credentials
    function authorise(callback) {
        const {client_secret, client_id, redirect_uris} = JSON.parse(credentials).web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(currentUser.credentials[0].key);
        callback(oAuth2Client)
    }

    function getAvailability(auth) {
        const calendar = google.calendar({version: 'v3', auth});
        calendar.freebusy.query({
            requestBody: {
                timeMin: req.query.dateFrom,
                timeMax: req.query.dateTo,
                items: [{
                    "id": "primary"
                }]
            }
        }, (err, apires) => {
            if (err) return console.log('The API returned an error: ' + err);
            availability = apires.data.calendars;
            res.status(200).json(availability);
        });
    }
}
