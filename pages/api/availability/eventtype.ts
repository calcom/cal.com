import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/client';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({req: req});

    if (!session) {
        res.status(401).json({message: "Not authenticated"});
        return;
    }

    if (req.method == "POST") {
        // TODO: Add user ID to user session object
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email,
            },
            select: {
                id: true
            }
        });

        if (!user) { res.status(404).json({message: 'User not found'}); return; }

        const title = req.body.title;
        const description = req.body.description;
        const length = parseInt(req.body.length);

        const createEventType = await prisma.eventType.create({
            data: {
                title: title,
                description: description,
                length: length,
                userId: user.id,
            },
        });

        res.status(200).json({message: 'Event created successfully'});
    }

    if (req.method == "PATCH") {
        // TODO: Add user ID to user session object
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email,
            },
            select: {
                id: true
            }
        });

        if (!user) { res.status(404).json({message: 'User not found'}); return; }

        const id = req.body.id;
        const title = req.body.title;
        const description = req.body.description;
        const length = parseInt(req.body.length);

        const updateEventType = await prisma.eventType.update({
            where: {
                id: id,
            },
            data: {
                title: title,
                description: description,
                length: length
            },
        });

        res.status(200).json({message: 'Event updated successfully'});
    }

    if (req.method == "DELETE") {
        // TODO: Add user ID to user session object
        const user = await prisma.user.findFirst({
            where: {
                email: session.user.email,
            },
            select: {
                id: true
            }
        });

        if (!user) { res.status(404).json({message: 'User not found'}); return; }

        const id = req.body.id;

        const deleteEventType = await prisma.eventType.delete({
            where: {
                id: id,
            },
        });

        res.status(200).json({message: 'Event deleted successfully'});
    }
}