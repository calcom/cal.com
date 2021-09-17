import { BookingStatus } from "@prisma/client";
import async from "async";

import { refund } from "@ee/lib/stripe/server";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { CalendarEvent, deleteEvent } from "@lib/calendarClient";
import prisma from "@lib/prisma";
import { deleteMeeting } from "@lib/videoClient";
import sendPayload from "@lib/webhooks/sendPayload";
import getSubscriberUrls from "@lib/webhooks/subscriberUrls";

import { dailyDeleteMeeting } from "../../lib/dailyVideoClient";

export default async function handler(req, res) {
  // just bail if it not a DELETE
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).end();
  }

  const uid = asStringOrNull(req.body.uid) || "";
  const session = await getSession({ req: req });

  const bookingToDelete = await prisma.booking.findUnique({
    where: {
      uid,
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          credentials: true,
          email: true,
          timeZone: true,
          name: true,
        },
      },
      attendees: true,
      location: true,
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
      payment: true,
      paid: true,
      location: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      uid: true,
      eventTypeId: true,
    },
  });

  if (!bookingToDelete || !bookingToDelete.user) {
    return res.status(404).end();
  }

  if ((!session || session.user?.id != bookingToDelete.user?.id) && bookingToDelete.startTime < new Date()) {
    return res.status(403).json({ message: "Cannot cancel past events" });
  }

  const organizer = await prisma.user.findFirst({
    where: {
      id: bookingToDelete.userId as number,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
    },
  });

  const evt: CalendarEvent = {
    type: bookingToDelete?.title,
    title: bookingToDelete?.title,
    description: bookingToDelete?.description || "",
    startTime: bookingToDelete?.startTime.toString(),
    endTime: bookingToDelete?.endTime.toString(),
    organizer: organizer,
    attendees: bookingToDelete?.attendees.map((attendee) => {
      const retObj = { name: attendee.name, email: attendee.email, timeZone: attendee.timeZone };
      return retObj;
    }),
  };

  // Hook up the webhook logic here
  const eventTrigger = "BOOKING_CANCELLED";
  // Send Webhook call if hooked to BOOKING.CANCELLED
  const subscriberUrls = await getSubscriberUrls(bookingToDelete.userId, eventTrigger);
  const promises = subscriberUrls.map((url) =>
    sendPayload(eventTrigger, new Date().toISOString(), url, evt).catch((e) => {
      console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${url}`, e);
    })
  );
  await Promise.all(promises);

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
    //deleting a Daily meeting

    const isDaily = bookingToDelete.location === "integrations:daily";
    const bookingUID = bookingToDelete.references.filter((ref) => ref.type === "daily")[0]?.uid;
    if (isDaily) {
      return await dailyDeleteMeeting(credential, bookingUID);
    }
  });

  if (bookingToDelete && bookingToDelete.paid) {
    const evt: CalendarEvent = {
      type: bookingToDelete.title,
      title: bookingToDelete.title,
      description: bookingToDelete.description ?? "",
      startTime: bookingToDelete.startTime.toISOString(),
      endTime: bookingToDelete.endTime.toISOString(),
      organizer: {
        email: bookingToDelete.user?.email ?? "dev@calendso.com",
        name: bookingToDelete.user?.name ?? "no user",
        timeZone: bookingToDelete.user?.timeZone ?? "",
      },
      attendees: bookingToDelete.attendees,
      location: bookingToDelete.location ?? "",
    };
    await refund(bookingToDelete, evt);
    await prisma.booking.update({
      where: {
        id: bookingToDelete.id,
      },
      data: {
        rejected: true,
      },
    });

    // We skip the deletion of the event, because that would also delete the payment reference, which we should keep
    await apiDeletes;
    return res.status(200).json({ message: "Booking successfully deleted." });
  }

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
