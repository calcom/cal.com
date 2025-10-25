import type { NextApiRequest, NextApiResponse } from "next";

import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { sendAddGuestsEmails } from "@calcom/emails";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, email } = req.query;

  if (!token || !email || typeof token !== "string" || typeof email !== "string") {
    return res.redirect("/guest-verification/error?reason=invalid_params");
  }

  try {
    const baseEmail = extractBaseEmail(email).toLowerCase();

    // Find pending guest with matching token
    const pendingGuest = await prisma.pendingGuest.findFirst({
      where: {
        email: baseEmail,
        token,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        email: true,
        bookingId: true,
        booking: {
          select: {
            id: true,
            uid: true,
            status: true,
            userId: true,
          },
        },
      },
    });

    if (!pendingGuest) {
      return res.redirect("/guest-verification/error?reason=not_found");
    }

    // Check if booking still exists and is not cancelled
    if (!pendingGuest.booking || pendingGuest.booking.status === "CANCELLED") {
      return res.redirect("/guest-verification/error?reason=booking_cancelled");
    }

    // Get organizer details
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { id: pendingGuest.booking.userId || 0 },
      select: {
        id: true,
        name: true,
        email: true,
        timeZone: true,
        locale: true,
        credentials: true,
        destinationCalendar: true,
      },
    });

    // Add guest as attendee
    const updatedBooking = await prisma.booking.update({
      where: { id: pendingGuest.bookingId },
      data: {
        attendees: {
          create: {
            email: pendingGuest.email,
            name: "",
            timeZone: organizer.timeZone,
            locale: organizer.locale,
          },
        },
      },
      include: {
        attendees: true,
        eventType: true,
        references: true,
        destinationCalendar: true,
        user: {
          include: {
            destinationCalendar: true,
          },
        },
      },
    });

    // Mark as verified
    await prisma.pendingGuest.update({
      where: { id: pendingGuest.id },
      data: { verified: true },
    });

    // Prepare calendar event
    const attendeesListPromises = updatedBooking.attendees.map(async (attendee) => ({
      name: attendee.name,
      email: attendee.email,
      timeZone: attendee.timeZone,
      language: {
        translate: await getTranslation(attendee.locale ?? "en", "common"),
        locale: attendee.locale ?? "en",
      },
    }));

    const attendeesList = await Promise.all(attendeesListPromises);
    const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");
    const videoCallReference = updatedBooking.references.find((ref) => ref.type.includes("_video"));

    const evt: CalendarEvent = {
      title: updatedBooking.title || "",
      type: updatedBooking.eventType?.title || updatedBooking.title || "",
      description: updatedBooking.description || "",
      startTime: dayjs(updatedBooking.startTime).format(),
      endTime: dayjs(updatedBooking.endTime).format(),
      organizer: {
        email: updatedBooking.userPrimaryEmail ?? organizer.email,
        name: organizer.name ?? "Nameless",
        timeZone: organizer.timeZone,
        language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: updatedBooking.uid,
      location: updatedBooking.location,
      destinationCalendar: updatedBooking.destinationCalendar
        ? [updatedBooking.destinationCalendar]
        : updatedBooking.user?.destinationCalendar
        ? [updatedBooking.user.destinationCalendar]
        : [],
    };

    if (videoCallReference) {
      evt.videoCallData = {
        type: videoCallReference.type,
        id: videoCallReference.meetingId,
        password: videoCallReference.meetingPassword,
        url: videoCallReference.meetingUrl,
      };
    }

    // Update calendar and send emails
    try {
      const credentials = await getUsersCredentialsIncludeServiceAccountKey(organizer);
      const eventManager = new EventManager({
        ...organizer,
        credentials,
        destinationCalendar: organizer.destinationCalendar,
      });
      await eventManager.updateCalendarAttendees(evt, updatedBooking);
      await sendAddGuestsEmails(evt, [pendingGuest.email]);
    } catch (err) {
      console.error("Error updating calendar or sending emails:", err);
    }

    return res.redirect("/guest-verification/success");
  } catch (error) {
    console.error("Guest verification error:", error);
    return res.redirect("/guest-verification/error?reason=server_error");
  }
}
