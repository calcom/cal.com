import { Prisma } from "@prisma/client";

import { getLocationGroupedOptions } from "@calcom/app-store/server";
import type { StripeData } from "@calcom/app-store/stripepayment/lib/server";
import { getEventTypeAppData } from "@calcom/app-store/utils";
import type { LocationObject } from "@calcom/core/location";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { parseBookingLimit, parseDurationLimit, parseRecurringEvent } from "@calcom/lib";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import type { Credential } from "@calcom/prisma/client";
import { SchedulingType, MembershipRole } from "@calcom/prisma/enums";
import { customInputSchema, EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

interface getEventTypeByIdProps {
  eventTypeId: number;
  userId: number;
  prisma: PrismaClient;
  isTrpcCall?: boolean;
  isUserOrganizationAdmin: boolean;
}

export default async function getEventTypeById({
  eventTypeId,
  userId,
  prisma,
  isTrpcCall = false,
  isUserOrganizationAdmin,
}: getEventTypeByIdProps) {
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    name: true,
    username: true,
    id: true,
    email: true,
    organizationId: true,
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
      offsetStart: true,
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
      lockTimeZoneToggleOnBookingPage: true,
      requiresConfirmation: true,
      requiresBookerEmailVerification: true,
      recurringEvent: true,
      hideCalendarNotes: true,
      disableGuests: true,
      minimumBookingNotice: true,
      beforeEventBuffer: true,
      afterEventBuffer: true,
      slotInterval: true,
      hashedLink: true,
      bookingLimits: true,
      onlyShowFirstAvailableSlot: true,
      durationLimits: true,
      successRedirectUrl: true,
      currency: true,
      bookingFields: true,
      parent: {
        select: {
          teamId: true,
        },
      },
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          parent: {
            select: {
              slug: true,
            },
          },
          members: {
            select: {
              role: true,
              accepted: true,
              user: {
                select: {
                  ...userSelect,
                  eventTypes: {
                    select: {
                      slug: true,
                    },
                  },
                },
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
          name: true,
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
      children: {
        select: {
          owner: {
            select: {
              name: true,
              username: true,
              email: true,
              id: true,
            },
          },
          hidden: true,
          slug: true,
        },
      },
      destinationCalendar: true,
      seatsPerTimeSlot: true,
      seatsShowAttendees: true,
      seatsShowAvailabilityCount: true,
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
                      parentId: true,
                      _count: {
                        select: {
                          children: true,
                        },
                      },
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

  const { locations, metadata, ...restEventType } = rawEventType;
  const newMetadata = EventTypeMetaDataSchema.parse(metadata || {}) || {};
  const apps = newMetadata?.apps || {};
  const eventTypeWithParsedMetadata = { ...rawEventType, metadata: newMetadata };

  newMetadata.apps = {
    ...apps,
    giphy: getEventTypeAppData(eventTypeWithParsedMetadata, "giphy", true),
  };

  const parsedMetaData = newMetadata;

  const parsedCustomInputs = (rawEventType.customInputs || []).map((input) => customInputSchema.parse(input));

  const eventType = {
    ...restEventType,
    schedule: rawEventType.schedule?.id || rawEventType.users[0]?.defaultScheduleId || null,
    scheduleName: rawEventType.schedule?.name || null,
    recurringEvent: parseRecurringEvent(restEventType.recurringEvent),
    bookingLimits: parseBookingLimit(restEventType.bookingLimits),
    durationLimits: parseDurationLimit(restEventType.durationLimits),
    locations: locations as unknown as LocationObject[],
    metadata: parsedMetaData,
    customInputs: parsedCustomInputs,
    users: rawEventType.users,
    children: restEventType.children.flatMap((ch) =>
      ch.owner !== null
        ? {
            ...ch,
            owner: {
              ...ch.owner,
              email: ch.owner.email,
              name: ch.owner.name ?? "",
              username: ch.owner.username ?? "",
              membership:
                restEventType.team?.members.find((tm) => tm.user.id === ch.owner?.id)?.role ||
                MembershipRole.MEMBER,
            },
            created: true,
          }
        : []
    ),
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

  const eventTypeUsers: ((typeof eventType.users)[number] & { avatar: string })[] = eventType.users.map(
    (user) => ({
      ...user,
      avatar: getUserAvatarUrl(user),
    })
  );

  const currentUser = eventType.users.find((u) => u.id === userId);

  const t = await getTranslation(currentUser?.locale ?? "en", "common");

  if (!currentUser?.id && !eventType.teamId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Could not find user or team",
    });
  }

  const locationOptions = await getLocationGroupedOptions(
    eventType.teamId ? { teamId: eventType.teamId } : { userId },
    t
  );
  if (eventType.schedulingType === SchedulingType.MANAGED) {
    locationOptions.splice(0, 0, {
      label: t("default"),
      options: [
        {
          label: t("members_default_location"),
          value: "",
          icon: "/user-check.svg",
        },
      ],
    });
  }

  const eventTypeObject = Object.assign({}, eventType, {
    users: eventTypeUsers,
    periodStartDate: eventType.periodStartDate?.toString() ?? null,
    periodEndDate: eventType.periodEndDate?.toString() ?? null,
    bookingFields: getBookingFieldsWithSystemFields(eventType),
  });

  const isOrgEventType = !!eventTypeObject.team?.parentId;
  const teamMembers = eventTypeObject.team
    ? eventTypeObject.team.members
        .filter((member) => member.accepted || isOrgEventType)
        .map((member) => {
          const user: typeof member.user & { avatar: string } = {
            ...member.user,
            avatar: getUserAvatarUrl(member.user),
          };
          return {
            ...user,
            eventTypes: user.eventTypes.map((evTy) => evTy.slug),
            membership: member.role,
          };
        })
    : [];

  // Find the current users membership so we can check role to enable/disable deletion.
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
    isUserOrganizationAdmin,
  };
  return finalObj;
}

const getStripeCurrency = (stripeMetadata: { currency: string }, credentials: Credential[]) => {
  // Favor the currency from the metadata as EventType.currency was not always set and should be deprecated
  if (stripeMetadata.currency) {
    return stripeMetadata.currency;
  }

  // Legacy support for EventType.currency
  const stripeCredential = credentials.find((integration) => integration.type === "stripe_payment");
  if (stripeCredential) {
    return (stripeCredential.key as unknown as StripeData)?.default_currency || "usd";
  }

  // Fallback to USD but should not happen
  return "usd";
};
