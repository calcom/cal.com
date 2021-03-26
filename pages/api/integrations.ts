import prisma from '../../lib/prisma';
import { getSession } from 'next-auth/client';

export default async function handler(req, res) {
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

        const credentials = await prisma.credential.findMany({
            where: {
                userId: user.id,
            },
            select: {
                type: true,
                key: true
            }
        });

        res.status(200).json(credentials);
    }
}