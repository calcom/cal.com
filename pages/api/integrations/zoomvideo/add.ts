import type {NextApiRequest, NextApiResponse} from 'next';
import {getSession} from 'next-auth/client';
import prisma from '../../../../lib/prisma';

const client_id = process.env.ZOOM_CLIENT_ID;

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

        const redirectUri = encodeURI(process.env.BASE_URL + '/api/integrations/zoomvideo/callback');
        const authUrl = 'https://zoom.us/oauth/authorize?response_type=code&client_id=' + client_id + '&redirect_uri=' + redirectUri;

        res.status(200).json({url: authUrl});
    }
}
