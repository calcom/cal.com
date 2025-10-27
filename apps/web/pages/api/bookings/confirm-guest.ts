import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { getUsersCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import EventManager from "@calcom/features/bookings/lib/EventManager";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server/i18n";
import { totpRawCheck } from "@calcom/lib/totp";
import prisma from "@calcom/prisma";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import type { CalendarEvent } from "@calcom/types/Calendar";

const querySchema = z.object({
  email: z.string().email(),
  bookingUid: z.string(),
  code: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, bookingUid, code } = querySchema.parse(req.query);

    const secret = createHash("md5")
      .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    const isValidToken = totpRawCheck(code, secret, { step: 172800 });

    if (!isValidToken) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=invalid_code`);
    }

    const bookingRepo = new BookingRepository(prisma);
    const result = await bookingRepo.confirmPendingGuest({ bookingUid, guestEmail: email });

    if (!result.success) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=${result.reason}`);
    }

    if (result.alreadyConfirmed) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmed?already=true`);
    }

    const booking = result.booking;
    if (!booking) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=booking_not_found`);
    }

    if (!booking.user) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=user_not_found`);
    }

    try {
      const credentials = await getUsersCredentialsIncludeServiceAccountKey({
        userId: booking.user.id,
      });
      const apps = eventTypeAppMetadataOptionalSchema.parse(booking.eventType?.metadata?.apps);
      const eventManager = new EventManager({ ...booking.user, credentials }, apps);

      const tOrganizer = await getTranslation(booking.user.locale ?? "en", "common");
      const tAttendees = await getTranslation(email, "common");

      const evt: CalendarEvent = {
        type: booking.eventType?.title || "Meeting",
        title: booking.title || booking.eventType?.title || "Meeting",
        description: booking.description || booking.eventType?.description || "",
        startTime: dayjs(booking.startTime).format(),
        endTime: dayjs(booking.endTime).format(),
        organizer: {
          id: booking.user.id,
          name: booking.user.name || "",
          email: booking.user.email,
          timeZone: booking.user.timeZone,
          language: { translate: tOrganizer, locale: booking.user.locale ?? "en" },
        },
        attendees: booking.attendees.map((attendee) => ({
          name: attendee.name,
          email: attendee.email,
          timeZone: attendee.timeZone,
          language: { translate: tAttendees, locale: attendee.locale ?? "en" },
        })),
        uid: booking.uid,
        destinationCalendar: booking.destinationCalendar
          ? [booking.destinationCalendar]
          : booking.user.destinationCalendar
          ? [booking.user.destinationCalendar]
          : [],
      };

      await eventManager.updateCalendarAttendees(evt, booking);
    } catch (calendarError) {
      console.error("Error updating calendar attendees:", calendarError);
    }

    return res.redirect(`${WEBAPP_URL}/booking/guest-confirmed`);
  } catch (error) {
    console.error("Error confirming guest:", error);
    return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=server_error`);
  }
}
