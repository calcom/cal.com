import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { createEvent, CalendarEvent } from '../../../lib/calendarClient';
import createConfirmBookedEmail from "../../../lib/emails/confirm-booked";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { user } = req.query;

    const currentUser = await prisma.user.findFirst({
        where: {
          username: user,
        },
        select: {
            credentials: true,
            timeZone: true,
            email: true,
            name: true,
        }
    });

    const evt: CalendarEvent = {
        type: req.body.eventName,
        title: req.body.eventName + ' with ' + req.body.name,
        description: req.body.notes,
        startTime: req.body.start,
        endTime: req.body.end,
        location: req.body.location,
        organizer: { email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone },
        attendees: [
            { email: req.body.email, name: req.body.name, timeZone: req.body.timeZone }
        ]
    };

    // TODO: for now, first integration created; primary = obvious todo; ability to change primary.
    const result = await createEvent(currentUser.credentials[0], evt);

    createConfirmBookedEmail(
      evt
    );

    res.status(200).json(result);
}
