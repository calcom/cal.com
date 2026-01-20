import type { TFunction } from "i18next";

import type { PaymentAppData } from "@calcom/app-store/_utils/payments/getPaymentAppData";
import type { EventTypeAppsList } from "@calcom/app-store/utils";
import type { GetUserAvailabilityResult } from "@calcom/features/availability/lib/getUserAvailability";
import type { userSelect } from "@calcom/prisma";
import type { App } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";
import type { SelectedCalendar } from "@calcom/prisma/client";
import type { CredentialForCalendarService } from "@calcom/types/Credential";

type User = Omit<Prisma.UserGetPayload<{ select: typeof userSelect }>, "selectedCalendars">;

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
  credentials: CredentialForCalendarService[];
  organization?: { slug: string };
  priority?: number;
  weight?: number;
  userLevelSelectedCalendars: SelectedCalendar[];
  allSelectedCalendars: SelectedCalendar[];
  groupId?: string | null;
  availabilityData?: GetUserAvailabilityResult;
};

export type { PaymentAppData };

export type Tracking = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};
