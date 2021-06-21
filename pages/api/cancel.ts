import prisma from '../../lib/prisma';
import {deleteEvent} from "../../lib/calendarClient";
import async from 'async';
import {deleteMeeting} from "../../lib/videoClient";

export default async function handler(req, res) {
  if (req.method == "POST") {
    const uid = req.body.uid;

    const bookingToDelete = await prisma.booking.findFirst({
      where: {
        uid: uid,
      },
      select: {
        id: true,
        user: {
          select: {
            credentials: true
          }
        },
        attendees: true,
        references: {
          select: {
            uid: true,
            type: true
          }
        }
      }
    });

    const apiDeletes = async.mapLimit(bookingToDelete.user.credentials, 5, async (credential) => {
      const bookingRefUid = bookingToDelete.references.filter((ref) => ref.type === credential.type)[0].uid;
      if(credential.type.endsWith("_calendar")) {
        return await deleteEvent(credential, bookingRefUid);
      } else if(credential.type.endsWith("_video")) {
        return await deleteMeeting(credential, bookingRefUid);
      }
    });
    const attendeeDeletes = prisma.attendee.deleteMany({
      where: {
        bookingId: bookingToDelete.id
      }
    });
    const bookingReferenceDeletes = prisma.bookingReference.deleteMany({
      where: {
        bookingId: bookingToDelete.id
      }
    });
    const bookingDeletes = prisma.booking.delete({
      where: {
        id: bookingToDelete.id,
      },
    });

    await Promise.all([
      apiDeletes,
      attendeeDeletes,
      bookingReferenceDeletes,
      bookingDeletes
    ]);

    //TODO Perhaps send emails to user and client to tell about the cancellation

    res.status(200).json({message: 'Booking successfully deleted.'});
  } else {
    res.status(405).json({message: 'This endpoint only accepts POST requests.'});
  }
}