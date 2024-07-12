import type { App } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import type { TFunction } from "next-i18next";

import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { AwaitedGetDefaultEvent } from "@calcom/lib/defaultEvents";
import type { PaymentAppData } from "@calcom/lib/getPaymentAppData";
import type { userSelect } from "@calcom/prisma";
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
import type { getRequiresConfirmationFlags } from "./getRequiresConfirmationFlags";
import type { AwaitedLoadUsers } from "./loadUsers";

type User = Prisma.UserGetPayload<typeof userSelect>;

export type OrganizerUser = AwaitedLoadUsers[number] & {
  isFixed?: boolean;
  metadata?: Prisma.JsonValue;
};

export type Invitee = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  timeZone: string;
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
  organization: { slug: string };
  priority?: number;
};

export type NewBookingEventType = AwaitedGetDefaultEvent | getEventTypeResponse;

export type IsConfirmedByDefault = ReturnType<typeof getRequiresConfirmationFlags>["isConfirmedByDefault"];

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
  AwaitedLoadUsers,
  getEventTypeResponse,
};
