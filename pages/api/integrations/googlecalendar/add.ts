import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../../lib/prisma';
const {google} = require('googleapis');

const credentials = process.env.GOOGLE_API_CREDENTIALS;
const scopes = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Check that user is authenticated
        const session = await getSession({req: req});

        if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

        // TODO: Add user ID to user session object
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email,
            },
            select: {
                id: true
            }
        });

        // Get token from Google Calendar API
        const {client_secret, client_id, redirect_uris} = JSON.parse(credentials).web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });

        res.status(200).json({url: authUrl});
    }
}