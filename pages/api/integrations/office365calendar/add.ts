import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../../lib/prisma';

const scopes = ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite', 'offline_access'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        // Check that user is authenticated
        const session = await getSession({req: req});

        if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

        // Get user
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email,
            },
            select: {
                id: true
            }
        });

        const hostname = 'x-forwarded-host' in req.headers ? 'https://' + req.headers['x-forwarded-host'] : 'host' in req.headers ? (req.secure ? 'https://' : 'http://') + req.headers['host'] : '';
        if ( ! hostname || ! req.headers.referer.startsWith(hostname)) {
            throw new Error('Unable to determine external url, check server settings');
        }

        function generateAuthUrl() {
            return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&scope=' + scopes.join(' ') + '&client_id=' + process.env.MS_GRAPH_CLIENT_ID + '&redirect_uri=' + hostname + '/api/integrations/office365calendar/callback';
        }

        res.status(200).json({url: generateAuthUrl() });
    }
}
