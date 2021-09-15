import prisma from "@lib/prisma";
import { deleteEvent } from "@lib/calendarClient";
import { deleteMeeting } from "@lib/videoClient";
import async from "async";
import { BookingStatus } from "@prisma/client";
import { asStringOrNull } from "@lib/asStringOrNull";

export default async function handler(req, res) {
  // just bail if it not a DELETE
  if (req.method !== "DELETE") {
    return res.status(405).end();
  }

  const uid = asStringOrNull(req.body.uid) || "";

  const bookingToDelete = await prisma.booking.findUnique({
    where: {
      uid,
    },
    select: {
      id: true,
      user: {
        select: {
          credentials: true,
        },
      },
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

  // by cancelling first, and blocking whilst doing so; we can ensure a cancel
  // action always succeeds even if subsequent integrations fail cancellation.
  await prisma.booking.update({
    where: {
      uid,
    },
    data: {
      status: BookingStatus.CANCELLED,
    },
  });

  const apiDeletes = async.mapLimit(bookingToDelete.user.credentials, 5, async (credential) => {
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

  await Promise.all([apiDeletes, attendeeDeletes, bookingReferenceDeletes]);

  //TODO Perhaps send emails to user and client to tell about the cancellation

  res.status(204).end();
}
