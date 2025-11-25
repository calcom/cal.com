import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/app-store/zod-utils";
import { getDefaultEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
import { getBrandingForEventType } from "@calcom/features/profile/lib/getBranding";
import { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { maybeGetBookingUidFromSeat } from "@calcom/lib/server/maybeGetBookingUidFromSeat";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { customInputSchema } from "@calcom/prisma/zod-utils";

import { BookingRepository } from "../repositories/BookingRepository";
import getBookingInfo from "./getBookingInfo";

type GetBookingDetailsParams = {
  prisma: PrismaClient;
  uid: string;
  seatReferenceUid?: string;
  eventTypeSlug?: string;
  userId?: number | null;
};

type UserSelect = {
  id: number;
  name: string | null;
  username: string | null;
  hideBranding: boolean;
  theme: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  email: string;
  timeZone: string;
  isPlatformManaged: boolean;
};

type BookingInfoType = Partial<
  Prisma.BookingGetPayload<{
    include: {
      attendees: { select: { name: true; email: true; phoneNumber: true } };
      seatsReferences: { select: { referenceUid: true } };
      user: {
        select: {
          id: true;
          name: true;
          email: true;
          username: true;
          timeZone: true;
        };
      };
    };
  }>
>;

// Booking field type - minimal type for the fields we need to access
type BookingFieldBase = {
  name: string;
  type: string;
  hidden?: boolean;
  label?: string;
  defaultLabel?: string;
};

// Base type for event type data - uses structural typing to be compatible with both
// getEventTypesFromDB return type and DefaultEvent
type EventTypeBase = {
  id: number;
  title: string;
  description: string | null;
  interfaceLanguage?: string | null;
  length: number;
  eventName: string | null;
  recurringEvent: Prisma.JsonValue;
  requiresConfirmation: boolean;
  canSendCalVideoTranscriptionEmails?: boolean;
  userId: number | null;
  successRedirectUrl: string | null;
  customInputs: Prisma.JsonValue;
  locations: Prisma.JsonValue;
  price: number;
  currency: string;
  // Using readonly array to accept both regular arrays and branded arrays (covariant)
  bookingFields: readonly BookingFieldBase[];
  allowReschedulingPastBookings?: boolean;
  hideOrganizerEmail: boolean | null;
  disableCancelling?: boolean;
  disableRescheduling?: boolean;
  disableGuests?: boolean;
  timeZone?: string | null;
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  seatsShowAvailabilityCount: boolean | null;
  schedulingType?: string | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  metadata: Prisma.JsonValue;
  teamId?: number | null;
  workflows?: unknown[];
  owner: UserSelect | null;
  users: UserSelect[];
  hosts: { user: UserSelect }[];
  team: {
    id: number;
    slug: string | null;
    name: string | null;
    hideBranding: boolean;
    brandColor: string | null;
    darkBrandColor: string | null;
    theme: string | null;
    parent: {
      hideBranding: boolean;
      brandColor: string | null;
      darkBrandColor: string | null;
      theme: string | null;
    } | null;
    createdByOAuthClientId: string | null;
  } | null;
  profile: {
    organizationId: number | null;
    organization: {
      brandColor: string | null;
      darkBrandColor: string | null;
      theme: string | null;
    } | null;
  } | null;
  parent: {
    teamId: number | null;
    team: {
      hideBranding: boolean;
      parent: {
        hideBranding: boolean;
      } | null;
    } | null;
  } | null;
  isDynamic: boolean;
};

// The function type - uses a callback pattern to accept any function that returns a compatible event type
// The bookingFields type is intentionally loose to accept both regular arrays and branded arrays from getBookingFieldsWithSystemFields
export type GetEventTypesFromDBFn = (
  id: number
) => Promise<(Omit<EventTypeBase, "bookingFields"> & { bookingFields: readonly BookingFieldBase[] } & Record<string, unknown>) | null | undefined>;
type HandleSeatsEventTypeOnBookingFn = (
  eventType: {
    seatsPerTimeSlot?: number | null;
    seatsShowAttendees: boolean | null;
    seatsShowAvailabilityCount: boolean | null;
    [x: string | number | symbol]: unknown;
  },
  bookingInfo: BookingInfoType,
  seatReferenceUid?: string,
  isHost?: boolean
) => Promise<BookingInfoType>;
type GetRecurringBookingsFn = (recurringEventId: string | null) => Promise<string[] | null>;

export type BookingDetailsResult = Awaited<ReturnType<typeof getBookingDetailsForViewer>>;

export async function getBookingDetailsForViewer(
  params: GetBookingDetailsParams,
  helpers: {
    getEventTypesFromDB: GetEventTypesFromDBFn;
    handleSeatsEventTypeOnBooking: HandleSeatsEventTypeOnBookingFn;
    getRecurringBookings: GetRecurringBookingsFn;
  }
) {
  const { prisma, eventTypeSlug, userId } = params;
  let { uid, seatReferenceUid } = params;

  const maybeBookingUidFromSeat = await maybeGetBookingUidFromSeat(prisma, uid);
  if (maybeBookingUidFromSeat.uid) uid = maybeBookingUidFromSeat.uid;
  if (maybeBookingUidFromSeat.seatReferenceUid) seatReferenceUid = maybeBookingUidFromSeat.seatReferenceUid;

  const { bookingInfoRaw, bookingInfo } = await getBookingInfo(uid);

  if (!bookingInfoRaw || !bookingInfo) {
    return null;
  }

  let rescheduledToUid: string | null = null;
  if (bookingInfo.rescheduled) {
    const bookingRepo = new BookingRepository(prisma);
    const rescheduledTo = await bookingRepo.findFirstBookingByReschedule({
      originalBookingUid: bookingInfo.uid,
    });
    rescheduledToUid = rescheduledTo?.uid ?? null;
  }

  let previousBooking: {
    rescheduledBy: string | null;
    uid: string;
  } | null = null;

  if (bookingInfo.fromReschedule) {
    const bookingRepo = new BookingRepository(prisma);
    previousBooking = await bookingRepo.findReschedulerByUid({
      uid: bookingInfo.fromReschedule,
    });
  }

  const eventTypeRaw = !bookingInfoRaw.eventTypeId
    ? getDefaultEvent(eventTypeSlug || "")
    : await helpers.getEventTypesFromDB(bookingInfoRaw.eventTypeId);

  if (!eventTypeRaw) {
    return null;
  }

  let requiresLoginToUpdate = false;
  if (eventTypeRaw.seatsPerTimeSlot && !seatReferenceUid && !userId) {
    requiresLoginToUpdate = true;
  }

  eventTypeRaw.users = eventTypeRaw.hosts?.length
    ? eventTypeRaw.hosts.map((host: { user: UserSelect }) => host.user)
    : eventTypeRaw.users;

  if (!eventTypeRaw.users.length) {
    if (!eventTypeRaw.owner) {
      if (bookingInfoRaw.user) {
        eventTypeRaw.users.push({
          ...bookingInfoRaw.user,
          hideBranding: false,
          theme: null,
          brandColor: null,
          darkBrandColor: null,
          isPlatformManaged: false,
        });
      } else {
        return null;
      }
    } else {
      eventTypeRaw.users.push({ ...eventTypeRaw.owner });
    }
  }

  const eventType = {
    ...eventTypeRaw,
    periodStartDate: eventTypeRaw.periodStartDate?.toString() ?? null,
    periodEndDate: eventTypeRaw.periodEndDate?.toString() ?? null,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventTypeRaw.metadata),
    recurringEvent: parseRecurringEvent(eventTypeRaw.recurringEvent),
    customInputs: customInputSchema.array().parse(eventTypeRaw.customInputs),
    hideOrganizerEmail: eventTypeRaw.hideOrganizerEmail,
    bookingFields: eventTypeRaw.bookingFields.map((field: BookingFieldBase) => {
      return {
        ...field,
        label: field.type === "boolean" ? markdownToSafeHTML(field.label || "") : field.label || "",
        defaultLabel:
          field.type === "boolean" ? markdownToSafeHTML(field.defaultLabel || "") : field.defaultLabel || "",
      };
    }),
  };

  const eventTypeForBranding = {
    team: eventTypeRaw.team
      ? {
          name: eventTypeRaw.team.name ?? undefined,
          brandColor: eventTypeRaw.team.brandColor,
          darkBrandColor: eventTypeRaw.team.darkBrandColor,
          theme: eventTypeRaw.team.theme,
          parent: eventTypeRaw.team.parent
            ? {
                brandColor: eventTypeRaw.team.parent.brandColor,
                darkBrandColor: eventTypeRaw.team.parent.darkBrandColor,
                theme: eventTypeRaw.team.theme,
              }
            : null,
        }
      : null,
    profile: eventTypeRaw.profile
      ? {
          organization: eventTypeRaw.profile.organization
            ? {
                brandColor: eventTypeRaw.profile.organization.brandColor,
                darkBrandColor: eventTypeRaw.profile.organization.darkBrandColor,
                theme: eventTypeRaw.profile.organization.theme,
              }
            : null,
        }
      : null,
    users: eventTypeRaw.users.map((user) => ({
      theme: user.theme,
      brandColor: user.brandColor,
      darkBrandColor: user.darkBrandColor,
    })),
  };

  const profile = {
    name: eventType.team?.name || eventType.users[0]?.name || null,
    email: eventType.team ? null : eventType.users[0].email || null,
    ...getBrandingForEventType({ eventType: eventTypeForBranding }),
    slug: eventType.team?.slug || eventType.users[0]?.username || null,
  };

  const checkIfUserIsHost = (checkUserId?: number | null) => {
    if (!checkUserId) return false;

    return (
      bookingInfo?.user?.id === checkUserId ||
      eventType.users.some(
        (user: UserSelect) =>
          user.id === checkUserId && bookingInfo.attendees.some((attendee) => attendee.email === user.email)
      ) ||
      eventType.hosts.some(
        ({ user }: { user: UserSelect }) =>
          user.id === checkUserId && bookingInfo.attendees.some((attendee) => attendee.email === user.email)
      )
    );
  };

  const isLoggedInUserHost = checkIfUserIsHost(userId);
  const eventTeamId = eventType.team?.id ?? eventType.parent?.teamId;

  let isLoggedInUserTeamMember = false;
  if (userId && eventTeamId) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        teamId: eventTeamId,
        accepted: true,
      },
    });
    isLoggedInUserTeamMember = !!membership;
  }

  const canViewHiddenData = isLoggedInUserHost || isLoggedInUserTeamMember;

  if (bookingInfo !== null && eventType.seatsPerTimeSlot) {
    await helpers.handleSeatsEventTypeOnBooking(eventType, bookingInfo, seatReferenceUid, isLoggedInUserHost);
  }

  const payment = await prisma.payment.findFirst({
    where: {
      bookingId: bookingInfo.id,
    },
    select: {
      appId: true,
      success: true,
      refunded: true,
      currency: true,
      amount: true,
      paymentOption: true,
    },
  });

  if (!canViewHiddenData) {
    for (const key in bookingInfo.responses) {
      const field = eventTypeRaw.bookingFields.find((field: BookingFieldBase) => field.name === key);
      if (field && !!field.hidden) {
        delete bookingInfo.responses[key];
      }
    }
  }

  async function getInternalNotePresets(teamId: number | null) {
    if (!teamId || !canViewHiddenData) return [];
    return await prisma.internalNotePreset.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        name: true,
        cancellationReason: true,
      },
    });
  }

  const internalNotes = await getInternalNotePresets(eventType.team?.id ?? eventType.parent?.teamId ?? null);

  const sanitizedPreviousBooking =
    eventType.hideOrganizerEmail &&
    previousBooking &&
    previousBooking.rescheduledBy === bookingInfo.user?.email
      ? { ...previousBooking, rescheduledBy: bookingInfo.user?.name }
      : previousBooking;

  const isPlatformBooking = eventType.users[0]?.isPlatformManaged || eventType.team?.createdByOAuthClientId;

  const recurringBookings = await helpers.getRecurringBookings(bookingInfo.recurringEventId);

  return {
    profile,
    eventType,
    recurringBookings,
    dynamicEventName: bookingInfo?.eventType?.eventName || "",
    bookingInfo,
    previousBooking: sanitizedPreviousBooking,
    paymentStatus: payment,
    requiresLoginToUpdate,
    rescheduledToUid,
    isLoggedInUserHost,
    canViewHiddenData,
    internalNotePresets: internalNotes,
    isPlatformBooking,
  };
}
