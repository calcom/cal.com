import { BookingStatus } from "@prisma/client";
import async from "async";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import { refund } from "@ee/lib/stripe/server";

import { asStringOrNull } from "@lib/asStringOrNull";
import { getSession } from "@lib/auth";
import { sendCancelledEmails } from "@lib/emails/email-manager";
import { FAKE_DAILY_CREDENTIAL } from "@lib/integrations/Daily/DailyVideoApiAdapter";
import { getCalendar } from "@lib/integrations/calendar/CalendarManager";
import { CalendarEvent } from "@lib/integrations/calendar/interfaces/Calendar";
import prisma from "@lib/prisma";
import { deleteMeeting } from "@lib/videoClient";
import sendPayload from "@lib/webhooks/sendPayload";
import getSubscribers from "@lib/webhooks/subscriptions";

import { getTranslation } from "@server/lib/i18n";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // just bail if it not a DELETE
  if (req.method !== "DELETE" && req.method !== "POST") {
    return res.status(405).end();
  }

  const uid = asStringOrNull(req.body.uid) || "";
  const cancellationReason = asStringOrNull(req.body.reason) || "";
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
          destinationCalendar: true,
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
      title: true,
      eventType: {
        select: {
          title: true,
        },
      },
      description: true,
      startTime: true,
      endTime: true,
      uid: true,
      eventTypeId: true,
      destinationCalendar: true,
    },
  });

  if (!bookingToDelete || !bookingToDelete.user) {
    return res.status(404).end();
  }

  if ((!session || session.user?.id !== bookingToDelete.user?.id) && bookingToDelete.startTime < new Date()) {
    return res.status(403).json({ message: "Cannot cancel past events" });
  }

  if (!bookingToDelete.userId) {
    return res.status(404).json({ message: "User not found" });
  }

  const organizer = await prisma.user.findFirst({
    where: {
      id: bookingToDelete.userId,
    },
    select: {
      name: true,
      email: true,
      timeZone: true,
      locale: true,
    },
    rejectOnNotFound: true,
  });

  const attendeesListPromises = bookingToDelete.attendees.map(async (attendee) => {
    return {
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    };
  });

  const attendeesList = await Promise.all(attendeesListPromises);
  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

  const evt: CalendarEvent = {
    title: bookingToDelete?.title,
    type: bookingToDelete?.eventType?.title as string,
    description: bookingToDelete?.description || "",
    startTime: bookingToDelete?.startTime ? dayjs(bookingToDelete.startTime).format() : "",
    endTime: bookingToDelete?.endTime ? dayjs(bookingToDelete.endTime).format() : "",
    organizer: {
      email: organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    uid: bookingToDelete?.uid,
    location: bookingToDelete?.location,
    destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
    cancellationReason: cancellationReason,
  };

  // Hook up the webhook logic here
  const eventTrigger = "BOOKING_CANCELLED";
  // Send Webhook call if hooked to BOOKING.CANCELLED
  const subscribers = await getSubscribers(bookingToDelete.userId, eventTrigger);
  const promises = subscribers.map((sub) =>
    sendPayload(eventTrigger, new Date().toISOString(), sub.subscriberUrl, evt, sub.payloadTemplate).catch(
      (e) => {
        console.error(`Error executing webhook for event: ${eventTrigger}, URL: ${sub.subscriberUrl}`, e);
      }
    )
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
      cancellationReason: cancellationReason,
    },
  });

  if (bookingToDelete.location === "integrations:daily") {
    bookingToDelete.user.credentials.push(FAKE_DAILY_CREDENTIAL);
  }

  const apiDeletes = async.mapLimit(bookingToDelete.user.credentials, 5, async (credential) => {
    const bookingRefUid = bookingToDelete.references.filter((ref) => ref.type === credential.type)[0]?.uid;
    if (bookingRefUid) {
      if (credential.type.endsWith("_calendar")) {
        const calendar = getCalendar(credential);

        return calendar?.deleteEvent(bookingRefUid, evt);
      } else if (credential.type.endsWith("_video")) {
        return deleteMeeting(credential, bookingRefUid);
      }
    }
  });

  if (bookingToDelete && bookingToDelete.paid) {
    const evt: CalendarEvent = {
      type: bookingToDelete?.eventType?.title as string,
      title: bookingToDelete.title,
      description: bookingToDelete.description ?? "",
      startTime: bookingToDelete.startTime.toISOString(),
      endTime: bookingToDelete.endTime.toISOString(),
      organizer: {
        email: bookingToDelete.user?.email ?? "dev@calendso.com",
        name: bookingToDelete.user?.name ?? "no user",
        timeZone: bookingToDelete.user?.timeZone ?? "",
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      location: bookingToDelete.location ?? "",
      uid: bookingToDelete.uid ?? "",
      destinationCalendar: bookingToDelete?.destinationCalendar || bookingToDelete?.user.destinationCalendar,
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

  await sendCancelledEmails(evt);

  res.status(204).end();
}
