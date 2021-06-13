import type {NextApiRequest, NextApiResponse} from 'next';
import prisma from '../../../lib/prisma';
import {CalendarEvent, createEvent, updateEvent} from '../../../lib/calendarClient';
import createConfirmBookedEmail from "../../../lib/emails/confirm-booked";
import async from 'async';
import {v5 as uuidv5} from 'uuid';
import short from 'short-uuid';

const translator = short();

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

  const rescheduleUid = req.body.rescheduleUid;

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

  const hashUID: string = translator.fromUUID(uuidv5(JSON.stringify(evt), uuidv5.URL));
  const cancelLink: string = process.env.BASE_URL + '/cancel/' + hashUID;
  const rescheduleLink:string = process.env.BASE_URL + '/reschedule/' + hashUID;
  const appendLinksToEvents = (event: CalendarEvent) => {
    const eventCopy = {...event};
    eventCopy.description += "\n\n"
      + "Need to change this event?\n"
      + "Cancel: " + cancelLink + "\n"
      + "Reschedule:" + rescheduleLink;

    return eventCopy;
  }

  const eventType = await prisma.eventType.findFirst({
    where: {
      userId: currentUser.id,
      title: evt.type
    },
    select: {
      id: true
    }
  });

  let results = undefined;
  let referencesToCreate = undefined;

  if (rescheduleUid) {
    // Reschedule event
    const booking = await prisma.booking.findFirst({
      where: {
        uid: rescheduleUid
      },
      select: {
        id: true,
        references: {
          select: {
            id: true,
            type: true,
            uid: true
          }
        }
      }
    });

    // Use all integrations
    results = await async.mapLimit(currentUser.credentials, 5, async (credential) => {
      const bookingRefUid = booking.references.filter((ref) => ref.type === credential.type)[0].uid;
      return await updateEvent(credential, bookingRefUid, appendLinksToEvents(evt))
    });

    // Clone elements
    referencesToCreate = [...booking.references];

    // Now we can delete the old booking and its references.
    let bookingReferenceDeletes = prisma.bookingReference.deleteMany({
      where: {
        bookingId: booking.id
      }
    });
    let attendeeDeletes = prisma.attendee.deleteMany({
      where: {
        bookingId: booking.id
      }
    });
    let bookingDeletes = prisma.booking.delete({
      where: {
        uid: rescheduleUid
      }
    });

    await Promise.all([
      bookingReferenceDeletes,
      attendeeDeletes,
      bookingDeletes
    ]);
  } else {
    // Schedule event
    results = await async.mapLimit(currentUser.credentials, 5, async (credential) => {
      const response = await createEvent(credential, appendLinksToEvents(evt));
      return {
        type: credential.type,
        response
      };
    });

    referencesToCreate = results.map((result => {
      return {
        type: result.type,
        uid: result.response.id
      };
    }));
  }

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

  // If one of the integrations allows email confirmations or no integrations are added, send it.
  if (currentUser.credentials.length === 0 || !results.every((result) => result.disableConfirmationEmail)) {
    await createConfirmBookedEmail(
      evt, cancelLink, rescheduleLink
    );
  }

  res.status(200).json(results);
}
