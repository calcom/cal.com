import type {NextApiRequest, NextApiResponse} from 'next';
import prisma from '../../../lib/prisma';
import {createEvent, CalendarEvent} from '../../../lib/calendarClient';
import createConfirmBookedEmail from "../../../lib/emails/confirm-booked";
import sha256 from "../../../lib/sha256";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const {user} = req.query;

    const currentUser = await prisma.user.findFirst({
        where: {
            username: user,
        },
        select: {
            id: true,
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
        organizer: {email: currentUser.email, name: currentUser.name, timeZone: currentUser.timeZone},
        attendees: [
            {email: req.body.email, name: req.body.name, timeZone: req.body.timeZone}
        ]
    };

    const eventType = await prisma.eventType.findFirst({
        where: {
            userId: currentUser.id,
            title: evt.type
        },
        select: {
            id: true
        }
    });

    const result = await createEvent(currentUser.credentials[0], evt);

    const hashUID = sha256(JSON.stringify(evt));
    const referencesToCreate = currentUser.credentials.length == 0 ? [] : [
        {
            type: currentUser.credentials[0].type,
            uid: result.id
        }
    ];

    await prisma.booking.create({
        data: {
            uid: hashUID,
            userId: currentUser.id,
            references: {
                create: referencesToCreate
            },
            eventTypeId: eventType.id,

            title: evt.title,
            description: evt.description,
            startTime: evt.startTime,
            endTime: evt.endTime,

            attendees: {
                create: evt.attendees
            }
        }
    });

    if (!result.disableConfirmationEmail) {
        createConfirmBookedEmail(
            evt
        );
    }

    res.status(200).json(result);
}
