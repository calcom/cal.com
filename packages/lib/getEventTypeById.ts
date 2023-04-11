import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import type { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import { getEventTypeAppData, getLocationGroupedOptions } from "@calcom/app-store/utils";
import type { LocationObject } from "@calcom/core/location";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseBookingLimit, parseDurationLimit, parseRecurringEvent } from "@calcom/lib";
import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { CAL_URL } from "@calcom/lib/constants";
import getPaymentAppData from "@calcom/lib/getPaymentAppData";
import { getTranslation } from "@calcom/lib/server/i18n";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

interface getEventTypeByIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient<
    Prisma.PrismaClientOptions,
    never,
    Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
  >;
  isTrpcCall?: boolean;
}

export default async function getEventTypeById({
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
}: getEventTypeByIdProps) {
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    name: true,
    username: true,
    id: true,
    avatar: true,
    email: true,
    locale: true,
    defaultScheduleId: true,
  });

  const rawEventType = await prisma.eventType.findFirst({
    where: {
      AND: [
        {
          OR: [
            {
              users: {
                some: {
                  id: userId,
                },
              },
            },
            {
              team: {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
            },
            {
              userId: userId,
            },
          ],
        },
        {
          id: eventTypeId,
        },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
      locations: true,
      eventName: true,
      customInputs: true,
      timeZone: true,
      periodType: true,
      metadata: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      requiresConfirmation: true,
      recurringEvent: true,
      hideCalendarNotes: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      bookingLimits: true,
      durationLimits: true,
      successRedirectUrl: true,
      currency: true,
      bookingFields: true,
      team: {
        select: {
          id: true,
          slug: true,
          members: {
            where: {
              accepted: true,
            },
            select: {
              role: true,
              user: {
                select: userSelect,
              },
            },
          },
        },
      },
      users: {
        select: userSelect,
      },
      schedulingType: true,
      schedule: {
        select: {
          id: true,
        },
      },
      hosts: {
        select: {
          isFixed: true,
          userId: true,
        },
      },
      userId: true,
      price: true,
      destinationCalendar: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      webhooks: {
        select: {
          id: true,
          subscriberUrl: true,
          payloadTemplate: true,
          active: true,
          eventTriggers: true,
          secret: true,
          eventTypeId: true,
        },
      },
      workflows: {
        include: {
          workflow: {
            include: {
              team: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  members: true,
                },
              },
              activeOn: {
                select: {
                  eventType: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
              steps: true,
            },
          },
        },
      },
    },
  });

  if (!rawEventType) {
    if (isTrpcCall) {
      throw new TRPCError({ code: "NOT_FOUND" });
    } else {
      throw new Error("Event type not found");
    }
  }

  const credentials = await prisma.credential.findMany({
    where: {
      userId,
      app: {
        enabled: true,
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
      userId: true,
      appId: true,
      invalid: true,
    },
  });

  const { locations, metadata, ...restEventType } = rawEventType;
  const newMetadata = EventTypeMetaDataSchema.parse(metadata || {})!;
  const apps = newMetadata.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };
  const stripeMetaData = getPaymentAppData(eventTypeWithParsedMetadata, true);
  newMetadata.apps = {
    ...apps,
    stripe: {
      ...stripeMetaData,
      paymentOption: stripeMetaData.paymentOption as string,
      currency:
        (
          credentials.find((integration) => integration.type === "stripe_payment")
            ?.key as unknown as StripeData
        )?.default_currency || "usd",
    },
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
    rainbow: getEventTypeAppData(eventTypeWithParsedMetadata, "rainbow", true),
  };

  // TODO: How to extract metadata schema from _EventTypeModel to be able to parse it?
  // const parsedMetaData = _EventTypeModel.parse(newMetadata);
  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    schedule: rawEventType.schedule?.id || rawEventType.users[0]?.defaultScheduleId || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    durationLimits: parseDurationLimit(restEventType.durationLimits),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
  };

  // backwards compat
  if (eventType.users.length === 0 && !eventType.team) {
    const fallbackUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userSelect,
    });
    if (!fallbackUser) {
      if (isTrpcCall) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The event type doesn't have user and no fallback user was found",
        });
      } else {
        throw Error("The event type doesn't have user and no fallback user was found");
      }
    }
    eventType.users.push(fallbackUser);
  }
  const currentUser = eventType.users.find((u) => u.id === userId);
  const t = await getTranslation(currentUser?.locale ?? "en", "common");
  const integrations = await getEnabledApps(credentials);
  const locationOptions = getLocationGroupedOptions(integrations, t);

  const eventTypeObject = Object.assign({}, eventType, {
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  });

  const teamMembers = eventTypeObject.team
    ? eventTypeObject.team.members.map((member) => {
        const user = member.user;
        user.avatar = `${CAL_URL}/${user.username}/avatar.png`;
        return user;
      })
    : [];

  // Find the current users memebership so we can check role to enable/disable deletion.
  // Sets to null if no membership is found - this must mean we are in a none team event type
  const currentUserMembership = eventTypeObject.team?.members.find((el) => el.user.id === userId) ?? null;

  let destinationCalendar = eventTypeObject.destinationCalendar;
  if (!destinationCalendar) {
    destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        userId: userId,
        eventTypeId: null,
      },
    });
  }

  const finalObj = {
    eventType: eventTypeObject,
    locationOptions,
    destinationCalendar,
    team: eventTypeObject.team || null,
    teamMembers,
    currentUserMembership,
  };
  return finalObj;
}
