import type { DestinationCalendar } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import type { EventNameObjectType } from "@calcom/core/event";
import type { getAllCredentials } from "@calcom/features/bookings/lib/getAllCredentialsForUsersOnEvent/getAllCredentials";
import type { getEventType } from "@calcom/features/bookings/lib/handleNewBooking/getEventType";
import type { CalendarEvent, AppsStatus } from "@calcom/types/Calendar";

export type BookingListenerCreateInput = {
  evt: CalendarEvent;
  allCredentials: Awaited<ReturnType<typeof getAllCredentials>>;
  organizerUser: {
    id: number;
    email: string;
    destinationCalendar: DestinationCalendar | null;
    username: string | null;
  };
  eventType: Awaited<ReturnType<typeof getEventType>>;
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
};
