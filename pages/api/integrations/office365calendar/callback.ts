import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../../lib/prisma';
const scopes = ['offline_access', 'Calendars.Read', 'Calendars.ReadWrite'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    // Check that user is authenticated
    const session = await getSession({req: req});
    if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

    const toUrlEncoded = payload => Object.keys(payload).map( (key) => key + '=' + encodeURIComponent(payload[ key ]) ).join('&');
    const hostname = 'x-forwarded-host' in req.headers ? 'https://' + req.headers['x-forwarded-host'] : 'host' in req.headers ? (req.secure ? 'https://' : 'http://') + req.headers['host'] : '';

    const body = toUrlEncoded({ client_id: process.env.MS_GRAPH_CLIENT_ID, grant_type: 'authorization_code', code, scope: scopes.join(' '), redirect_uri: hostname + '/api/integrations/office365calendar/callback', client_secret: process.env.MS_GRAPH_CLIENT_SECRET });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    }, body });

    const responseBody = await response.json();

    if (!response.ok) {
        return res.redirect('/integrations?error=' + JSON.stringify(responseBody));
    }

    const whoami = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { 'Authorization': 'Bearer ' + responseBody.access_token } });
    const graphUser = await whoami.json();

    // In some cases, graphUser.mail is null. Then graphUser.userPrincipalName most likely contains the email address.
    responseBody.email = graphUser.mail ?? graphUser.userPrincipalName;
    responseBody.expiry_date = Math.round((+(new Date()) / 1000) + responseBody.expires_in); // set expiry date in seconds
    delete responseBody.expires_in;

    const credential = await prisma.credential.create({
        data: {
            type: 'office365_calendar',
            key: responseBody,
            userId: session.user.id
        }
    });

    return res.redirect('/integrations');
}
