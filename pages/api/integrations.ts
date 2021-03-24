import prisma from '../../lib/prisma';
import { getSession } from 'next-auth/client';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        // Check that user is authenticated
        const session = await getSession({req: req});

        if (!session) { res.status(401).json({message: 'You must be logged in to do this'}); return; }

        // TODO: Add user ID so filtering works properly. User object does not include ID currently.

        const credentials = await prisma.credential.findMany({
            where: {
                userId: session.user.id,
            },
            select: {
                type: true
            }
        });

        res.status(200).json(credentials);
    }
}