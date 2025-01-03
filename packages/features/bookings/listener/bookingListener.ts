import type { DestinationCalendar } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import type { getAllCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import type { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import tasker from "@calcom/features/tasker";
import type { CalendarEvent, AppsStatus } from "@calcom/types/Calendar";

import bookingCreated from "./lib/bookingCreated";

class BookingListener {
  static async create({
    evt,
    allCredentials,
    organizerUser,
    eventType,
    tOrganizer,
    booking,
    eventNameObject,
    teamId,
    platformClientId,
    bookerUrl,
  }: {
    evt: CalendarEvent;
    allCredentials: Awaited<ReturnType<typeof getAllCredentials>>;
    organizerUser: {
      id: number;
      email: string;
      destinationCalendar: DestinationCalendar | null;
      username: string | null;
    };
    eventType: Awaited<ReturnType<typeof getEventTypesFromDB>>;
    tOrganizer: TFunction;
    booking: {
      id: number;
      startTime: Date;
      endTime: Date;
      location?: string | null;
      appsStatus?: AppsStatus[];
      iCalUID: string | null;
      description: string | null;
      customInputs: Prisma.JsonValue | null;
      metadata: Prisma.JsonValue | null;
      smsReminderNumber?: string | null;
    };
    eventNameObject: EventNameObjectType;
    teamId?: number | null;
    platformClientId?: string;
    bookerUrl: string;
  }) {
    console.log("🚀 ~ BookingListener ~ TRIGGER_PROJECT_ID:", process.env.TRIGGER_PROJECT_ID);
    if (process.env.TRIGGER_PROJECT_ID) {
      await tasker.create("bookingListener-create", { bookingId: booking.id });
      return;
    }

    await bookingCreated({
      evt,
      allCredentials,
      organizerUser,
      eventType,
      tOrganizer,
      booking,
      eventNameObject,
      teamId,
      platformClientId,
      bookerUrl,
    });
  }
}

export default BookingListener;
