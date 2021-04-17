import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({req: req});

    if (!session) {
        res.status(401).json({message: "Not authenticated"});
        return;
    }

    // TODO: Add user ID to user session object
    const user = await prisma.user.findFirst({
        where: {
            email: session.user.email,
        },
        select: {
            id: true,
            password: true
        }
    });

    if (!user) { res.status(404).json({message: 'User not found'}); return; }

    const username = req.body.username;
    const name = req.body.name;
    const bio = req.body.description;

    const updateUser = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          username,
          name,
          bio
        },
    });

    res.status(200).json({message: 'Profile updated successfully'});
}