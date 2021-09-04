import prisma from "@lib/prisma";
import { deleteEvent } from "@lib/calendarClient";
import { deleteMeeting } from "@lib/videoClient";
import async from "async";
import { Credential } from "@prisma/client";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).end();
  }

  const bookingToDelete = await prisma.booking.findUnique({
    where: {
      uid: req.body.uid || "",
    },
    select: {
      id: true,
      organizers: {
        select: {
          credentials: true,
        },
      },
      userId: true,
      attendees: true,
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
    },
  });

  if (!bookingToDelete) {
    return res.status(404).end();
  }

  // merge all credentials of all organizers..
  const credentials: Credential[] = bookingToDelete.organizers || [];
  // backwards compat, todo: remove.
  if (bookingToDelete.userId) {
    credentials.concat(
      await prisma.credential.findMany({
        where: {
          userId: bookingToDelete.userId,
        },
      })
    );
  }

  const apiDeletes = async.mapLimit(credentials, 5, async (credential) => {
    const bookingRefUid = bookingToDelete.references.filter((ref) => ref.type === credential.type)[0]?.uid;
    if (bookingRefUid) {
      if (credential.type.endsWith("_calendar")) {
        return await deleteEvent(credential, bookingRefUid);
      } else if (credential.type.endsWith("_video")) {
        return await deleteMeeting(credential, bookingRefUid);
      }
    }
  });
  const attendeeDeletes = prisma.attendee.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });
  const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
    where: {
      bookingId: bookingToDelete.id,
    },
  });
  const bookingDeletes = prisma.booking.delete({
    where: {
      id: bookingToDelete.id,
    },
  });

  await Promise.all([apiDeletes, attendeeDeletes, bookingReferenceDeletes, bookingDeletes]);

  //TODO Perhaps send emails to user and client to tell about the cancellation

  res.status(204).end();
}
