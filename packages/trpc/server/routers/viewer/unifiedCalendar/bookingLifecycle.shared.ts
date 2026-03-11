import short from "short-uuid";
import { v5 as uuidv5 } from "uuid";

import { getUid } from "@calcom/lib/CalEventParser";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/lib/getConnectedDestinationCalendars";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { Booking, DestinationCalendar } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";

import { TRPCError } from "@trpc/server";

const translator = short();

const toNormalizedEmail = (value: string) => value.trim().toLowerCase();

const isSupportedUnifiedIntegration = (integrationType: string): boolean => {
  const normalized = integrationType.toLowerCase();
  if (normalized.includes("google")) return true;
  return (
    normalized.includes("outlook") || normalized.includes("office365") || normalized.includes("microsoft")
  );
};

const normalizeDurationMinutes = (start: Date, end: Date): number => {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
};

export const toDateOrThrow = (value: string, fieldName: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid ${fieldName}`,
    });
  }
  return parsed;
};

export const assertValidTimeRange = (start: Date, end: Date) => {
  if (end <= start) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "endTime must be after startTime",
    });
  }
};

export const getUniqueAttendeeEmails = (emails: string[]) => {
  const deduplicated = Array.from(new Set(emails.map(toNormalizedEmail).filter(Boolean)));
  return deduplicated;
};

export const buildAttendeeRows = (params: { attendeeEmails: string[]; locale: string; timeZone: string }) => {
  return params.attendeeEmails.map((email) => ({
    email,
    name: email,
    locale: params.locale,
    timeZone: params.timeZone,
  }));
};

const getLocaleOrDefault = (locale: string | null | undefined) => locale ?? "en";
const getTimeZoneOrDefault = (timeZone: string | null | undefined) => timeZone ?? "UTC";

export const buildOrganizerPerson = async (user: NonNullable<TrpcSessionUser>): Promise<Person> => {
  const locale = getLocaleOrDefault(user.locale);
  const organizerTranslation = await getTranslation(locale, "common");

  return {
    name: user.name || user.username || user.email,
    email: user.email,
    username: user.username ?? undefined,
    timeZone: getTimeZoneOrDefault(user.timeZone),
    language: {
      translate: organizerTranslation,
      locale,
    },
  };
};

export const buildAttendeePeople = async (params: {
  attendees: {
    email: string;
    name: string;
    locale: string | null;
    timeZone: string;
    phoneNumber: string | null;
  }[];
}): Promise<Person[]> => {
  const translationByLocale = new Map<string, Awaited<ReturnType<typeof getTranslation>>>();

  const people = await Promise.all(
    params.attendees.map(async (attendee) => {
      const locale = getLocaleOrDefault(attendee.locale);
      let translate = translationByLocale.get(locale);
      if (!translate) {
        translate = await getTranslation(locale, "common");
        translationByLocale.set(locale, translate);
      }

      return {
        name: attendee.name || attendee.email,
        email: attendee.email,
        phoneNumber: attendee.phoneNumber,
        timeZone: attendee.timeZone,
        language: {
          translate,
          locale,
        },
      } satisfies Person;
    })
  );

  return people;
};

export const buildUnifiedCalendarEvent = async (params: {
  booking: Pick<
    Booking,
    "id" | "uid" | "title" | "description" | "startTime" | "endTime" | "location" | "iCalUID"
  >;
  destinationCalendar: DestinationCalendar | null;
  organizer: NonNullable<TrpcSessionUser>;
  attendees: {
    email: string;
    name: string;
    locale: string | null;
    timeZone: string;
    phoneNumber: string | null;
  }[];
  conferenceCredentialId?: number | null;
  cancellationReason?: string | null;
}): Promise<CalendarEvent> => {
  const organizerPerson = await buildOrganizerPerson(params.organizer);
  const attendeePeople = await buildAttendeePeople({ attendees: params.attendees });

  const calEvent: CalendarEvent = {
    type: "unified-calendar-booking",
    title: params.booking.title,
    description: params.booking.description,
    bookerUrl: WEBAPP_URL,
    uid: params.booking.uid,
    iCalUID: params.booking.iCalUID || getUid({ uid: params.booking.uid }),
    startTime: params.booking.startTime.toISOString(),
    endTime: params.booking.endTime.toISOString(),
    length: normalizeDurationMinutes(params.booking.startTime, params.booking.endTime),
    bookingId: params.booking.id,
    organizer: organizerPerson,
    attendees: attendeePeople,
    location: params.booking.location,
    destinationCalendar: params.destinationCalendar ? [params.destinationCalendar] : [],
    conferenceCredentialId:
      typeof params.conferenceCredentialId === "number" ? params.conferenceCredentialId : undefined,
    cancellationReason: params.cancellationReason ?? undefined,
  };

  return calEvent;
};

export const mapReferencesForPrismaCreate = (references: PartialReference[]) => {
  return references
    .filter((reference) => reference.type && reference.uid)
    .map((reference) => ({
      type: reference.type,
      uid: reference.uid,
      meetingId: reference.meetingId ?? null,
      meetingPassword: reference.meetingPassword ?? null,
      meetingUrl: reference.meetingUrl ?? null,
      externalCalendarId: reference.externalCalendarId ?? null,
      thirdPartyRecurringEventId: reference.thirdPartyRecurringEventId ?? null,
      credentialId: reference.credentialId ?? null,
      delegationCredentialId: reference.delegationCredentialId ?? null,
    }));
};

export const replaceBookingReferences = async (params: {
  bookingId: number;
  references: PartialReference[];
}) => {
  const mappedReferences = mapReferencesForPrismaCreate(params.references);

  if (mappedReferences.length === 0) {
    return;
  }

  await prisma.booking.update({
    where: {
      id: params.bookingId,
    },
    data: {
      references: {
        deleteMany: {},
        createMany: {
          data: mappedReferences,
        },
      },
    },
  });
};

export const generateUnifiedBookingUid = (params: {
  organizerEmail: string;
  startTime: Date;
  title: string;
}) => {
  const seed = `${params.organizerEmail}:${params.startTime.toISOString()}:${params.title}:${Date.now()}`;
  return translator.fromUUID(uuidv5(seed, uuidv5.URL));
};

type ResolveTargetCalendarInput = {
  credentialId: number;
  providerCalendarId: string;
};

type ConnectedDestinationCalendars = Awaited<
  ReturnType<typeof getConnectedDestinationCalendarsAndEnsureDefaultsInDb>
>;

type ConnectedCalendarGroup = ConnectedDestinationCalendars["connectedCalendars"][number] & {
  delegationCredentialId?: string | null;
};

type ConnectedCalendar = NonNullable<ConnectedCalendarGroup["calendars"]>[number] & {
  integration?: string;
};

export const resolveUnifiedTargetDestinationCalendar = async (params: {
  user: NonNullable<TrpcSessionUser>;
  targetCalendar: ResolveTargetCalendarInput;
}): Promise<DestinationCalendar> => {
  const connectedDestinationCalendars = await getConnectedDestinationCalendarsAndEnsureDefaultsInDb({
    user: params.user,
    onboarding: false,
    eventTypeId: null,
    prisma,
  });

  const calendarGroups = connectedDestinationCalendars.connectedCalendars as ConnectedCalendarGroup[];
  const matchedGroup = calendarGroups.find(
    (group) => group.credentialId === params.targetCalendar.credentialId
  );

  if (!matchedGroup) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Target calendar is not connected",
    });
  }

  if (!isSupportedUnifiedIntegration(matchedGroup.integration.type)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only Google and Outlook calendars are supported",
    });
  }

  const matchedCalendar = (matchedGroup.calendars as ConnectedCalendar[] | undefined)?.find(
    (calendar) => calendar.externalId === params.targetCalendar.providerCalendarId
  );

  if (!matchedCalendar) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected calendar was not found on the connected account",
    });
  }

  const integrationType = String(matchedCalendar.integration ?? matchedGroup.integration.type);

  if (!isSupportedUnifiedIntegration(integrationType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only Google and Outlook calendars are supported",
    });
  }

  const existingRuntimeDestination = await prisma.destinationCalendar.findFirst({
    where: {
      userId: null,
      eventTypeId: null,
      integration: integrationType,
      externalId: matchedCalendar.externalId,
      primaryEmail: matchedGroup.primary?.email ?? null,
      credentialId: matchedGroup.credentialId ?? null,
      delegationCredentialId: matchedGroup.delegationCredentialId ?? null,
    },
  });

  if (existingRuntimeDestination) {
    return existingRuntimeDestination;
  }

  return prisma.destinationCalendar.create({
    data: {
      integration: integrationType,
      externalId: matchedCalendar.externalId,
      credentialId: matchedGroup.credentialId ?? null,
      delegationCredentialId: matchedGroup.delegationCredentialId ?? null,
      primaryEmail: matchedGroup.primary?.email ?? null,
    },
  });
};
