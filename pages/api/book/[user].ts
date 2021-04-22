import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { createEvent, CalendarEvent } from '../../../lib/calendarClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query;

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true,
        }
    });

    const evt: CalendarEvent = {
        title: 'Meeting with ' + req.body.name,
        description: req.body.notes,
        startTime: req.body.start,
        endTime: req.body.end,
        timeZone: currentUser.timeZone,
        attendees: [
            { email: req.body.email, name: req.body.name }
        ]
    };

    // TODO: for now, first integration created; primary = obvious todo; ability to change primary.
    const result = await createEvent(currentUser.credentials[0], evt);
    res.status(200).json(result);
}
