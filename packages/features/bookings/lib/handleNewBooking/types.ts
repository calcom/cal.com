import type { App } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { DefaultEvent } from "@calcom/lib/defaultEvents";
import type { PaymentAppData } from "@calcom/lib/getPaymentAppData";
import type { userSelect } from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { CredentialPayload } from "@calcom/types/Credential";

import type { Booking } from "./createBooking";
import type {
  AwaitedBookingData,
  RescheduleReason,
  NoEmail,
  AdditionalNotes,
  ReqAppsStatus,
  SmsReminderNumber,
  EventTypeId,
  ReqBodyMetadata,
} from "./getBookingData";
import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { BookingType, OriginalRescheduledBooking } from "./getOriginalRescheduledBooking";
import type { LoadedUsers } from "./loadUsers";

type User = Omit<Prisma.UserGetPayload<typeof userSelect>, "selectedCalendars">;

export type OrganizerUser = LoadedUsers[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
};

export type Invitee = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  phoneNumber?: string;
  language: {
    translate: TFunction;
    locale: string;
  };
}[];

export interface IEventTypePaymentCredentialType {
  appId: EventTypeAppsList;
  app: {
    categories: App["categories"];
    dirName: string;
  };
  key: Prisma.JsonValue;
}

export type IsFixedAwareUser = User & {
  isFixed: boolean;
  credentials: CredentialPayload[];
  organization?: { slug: string };
  priority?: number;
  weight?: number;
  userLevelSelectedCalendars: SelectedCalendar[];
  allSelectedCalendars: SelectedCalendar[];
};

export type NewBookingEventType = DefaultEvent | getEventTypeResponse;

export type {
  AwaitedBookingData,
  RescheduleReason,
  NoEmail,
  AdditionalNotes,
  ReqAppsStatus,
  SmsReminderNumber,
  EventTypeId,
  ReqBodyMetadata,
  PaymentAppData,
  BookingType,
  Booking,
  OriginalRescheduledBooking,
  LoadedUsers,
  getEventTypeResponse,
};
