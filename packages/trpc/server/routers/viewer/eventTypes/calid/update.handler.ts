import {
  canDisableParticipantNotifications,
  canDisableOrganizerNotifications,
} from "@calid/features/modules/workflows/utils/notificationDisableCheck";
import { Prisma } from "@prisma/client";
import type { NextApiResponse, GetServerSidePropsContext } from "next";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { DailyLocationType } from "@calcom/app-store/locations";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import tasker from "@calcom/features/tasker";
import { IS_DEV, ONEHASH_API_KEY, ONEHASH_CHAT_SYNC_BASE_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CalVideoSettingsRepository } from "@calcom/lib/server/repository/calVideoSettings";
import { HashedLinkRepository } from "@calcom/lib/server/repository/hashedLinkRepository";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import { HashedLinkService } from "@calcom/lib/server/service/hashedLinkService";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { PrismaClient } from "@calcom/prisma";
import { WorkflowTriggerEvents } from "@calcom/prisma/client";
import { SchedulingType, EventTypeAutoTranslatedField } from "@calcom/prisma/enums";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import { eventTypeLocations } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import { setDestinationCalendarHandler } from "../../../viewer/calendars/setDestinationCalendar.handler";
import type { TCalIdUpdateInputSchema } from "./update.schema";
import {
  ensureUniqueBookingFields,
  ensureEmailOrPhoneNumberIsPresent,
  handleCustomInputs,
  handlePeriodType,
} from "./util";

type SessionUser = NonNullable<TrpcSessionUser>;

type User = {
  id: SessionUser["id"];
  username: SessionUser["username"];
  profile: {
    id: SessionUser["profile"]["id"] | null;
  };
  userLevelSelectedCalendars: SessionUser["userLevelSelectedCalendars"];
  organizationId: number | null;
  email: SessionUser["email"];
  locale: string;
  metadata: SessionUser["metadata"];
};

type UpdateOptions = {
  ctx: {
    user: User;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
    prisma: PrismaClient;
  };
  input: TCalIdUpdateInputSchema;
};

export type UpdateEventTypeReturn = Awaited<ReturnType<typeof updateHandler>>;

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const {
    schedule,
    instantMeetingSchedule,
    periodType,
    locations,
    bookingLimits,
    durationLimits,
    maxActiveBookingsPerBooker,
    destinationCalendar,
    customInputs,
    recurringEvent,
    eventTypeColor,
    users,
    children,
    assignAllTeamMembers,
    hosts,
    id,
    multiplePrivateLinks,
    // Extract this from the input so it doesn't get saved in the db
    // eslint-disable-next-line
    userId,
    bookingFields,
    offsetStart,
    secondaryEmailId,
    isRRWeightsEnabled,
    autoTranslateDescriptionEnabled,
    description: newDescription,
    title: newTitle,
    seatsPerTimeSlot,
    restrictionScheduleId,
    calIdTeamId,
    ...rest
  } = input;

  const eventType = await ctx.prisma.eventType.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      title: true,
      locations: true,
      description: true,
      seatsPerTimeSlot: true,
      recurringEvent: true,
      maxActiveBookingsPerBooker: true,
      fieldTranslations: {
        select: {
          field: true,
        },
      },
      isRRWeightsEnabled: true,
      hosts: {
        select: {
          userId: true,
          priority: true,
          weight: true,
          isFixed: true,
        },
      },
      aiPhoneCallConfig: {
        select: {
          generalPrompt: true,
          beginMessage: true,
          enabled: true,
          llmId: true,
        },
      },
      calVideoSettings: {
        select: {
          disableRecordingForOrganizer: true,
          disableRecordingForGuests: true,
          enableAutomaticTranscription: true,
          enableAutomaticRecordingForOrganizer: true,
          disableTranscriptionForGuests: true,
          disableTranscriptionForOrganizer: true,
          redirectUrlOnExit: true,
        },
      },
      children: {
        select: {
          userId: true,
        },
      },
      calIdWorkflows: {
        select: {
          workflowId: true,
        },
      },
      calIdTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          members: {
            select: {
              role: true,
              acceptedInvitation: true,
              user: {
                select: {
                  name: true,
                  id: true,
                  email: true,
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
    },
  });

  if (input.calIdTeamId && eventType.calIdTeam?.id && input.calIdTeamId !== eventType.calIdTeam.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const finalSeatsPerTimeSlot = seatsPerTimeSlot ?? eventType.seatsPerTimeSlot;
  const finalRecurringEvent = recurringEvent ?? eventType.recurringEvent;

  if (finalSeatsPerTimeSlot && finalRecurringEvent) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Recurring Events and Offer Seats cannot be active at the same time.",
    });
  }

  const currentCalIdTeamId = input.calIdTeamId || eventType.calIdTeam?.id;
  const guestsField = bookingFields?.find((field) => field.name === "guests");

  ensureUniqueBookingFields(bookingFields);
  ensureEmailOrPhoneNumberIsPresent(bookingFields);

  if (autoTranslateDescriptionEnabled && !ctx.user.organizationId) {
    logger.error(
      "Auto-translating description requires an organization. This should not happen - UI controls should prevent this state."
    );
  }

  const data: Prisma.EventTypeUpdateInput = {
    ...rest,
    // autoTranslate feature is allowed for org users only
    autoTranslateDescriptionEnabled: !!(ctx.user.organizationId && autoTranslateDescriptionEnabled),
    description: newDescription,
    title: newTitle,
    bookingFields,
    isRRWeightsEnabled,
    rrSegmentQueryValue:
      rest.rrSegmentQueryValue === null ? Prisma.DbNull : (rest.rrSegmentQueryValue as Prisma.InputJsonValue),
    metadata: rest.metadata === null ? Prisma.DbNull : (rest.metadata as Prisma.InputJsonObject),
    eventTypeColor: eventTypeColor === null ? Prisma.DbNull : (eventTypeColor as Prisma.InputJsonObject),
    disableGuests: guestsField?.hidden ?? false,
    seatsPerTimeSlot,
    // maxLeadThreshold:
    //   eventType.team?.rrTimestampBasis && eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT
    //     ? null
    //     : rest.maxLeadThreshold,
    calIdTeam: calIdTeamId ? { connect: { id: calIdTeamId } } : undefined,
  };
  data.locations = locations ?? undefined;

  if (periodType) {
    data.periodType = handlePeriodType(periodType);
  }

  if (recurringEvent) {
    data.recurringEvent = {
      dstart: recurringEvent.dtstart as unknown as Prisma.InputJsonObject,
      interval: recurringEvent.interval,
      count: recurringEvent.count,
      freq: recurringEvent.freq,
      until: recurringEvent.until as unknown as Prisma.InputJsonObject,
      tzid: recurringEvent.tzid,
    };
  } else if (recurringEvent === null) {
    data.recurringEvent = Prisma.DbNull;
  }

  if (destinationCalendar) {
    /** We connect or create a destination calendar to the event type instead of the user */
    await setDestinationCalendarHandler({
      ctx,
      input: {
        ...destinationCalendar,
        eventTypeId: id,
      },
    });
  }

  if (customInputs) {
    data.customInputs = handleCustomInputs(customInputs, id);
  }

  if (bookingLimits) {
    const isValid = validateIntervalLimitOrder(bookingLimits);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booking limits must be in ascending order." });
    data.bookingLimits = bookingLimits;
  }

  if (maxActiveBookingsPerBooker || maxActiveBookingsPerBooker === null) {
    if (maxActiveBookingsPerBooker && maxActiveBookingsPerBooker < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booker booking limit must be greater than 0." });
    }

    if (maxActiveBookingsPerBooker && (recurringEvent || eventType.recurringEvent)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Recurring Events and booker active bookings limit cannot be active at the same time.",
      });
    }

    if (eventType.maxActiveBookingsPerBooker && recurringEvent) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Recurring Events and booker active bookings limit cannot be active at the same time.",
      });
    }

    data.maxActiveBookingsPerBooker = maxActiveBookingsPerBooker;
    if (maxActiveBookingsPerBooker === null) {
      data.maxActiveBookingPerBookerOfferReschedule = false;
    }
  }

  if (durationLimits) {
    const isValid = validateIntervalLimitOrder(durationLimits);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Duration limits must be in ascending order." });
    data.durationLimits = durationLimits;
  }

  if (offsetStart !== undefined) {
    if (offsetStart < 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Offset start time must be zero or greater." });
    }
    data.offsetStart = offsetStart;
  }

  const bookerLayoutsError = validateBookerLayouts(input.metadata?.bookerLayouts || null);
  if (bookerLayoutsError) {
    const t = await getTranslation("en", "common");
    throw new TRPCError({ code: "BAD_REQUEST", message: t(bookerLayoutsError) });
  }

  if (schedule) {
    // Check that the schedule belongs to the user
    const userScheduleQuery = await ctx.prisma.schedule.findFirst({
      where: {
        userId: ctx.user.id,
        id: schedule,
      },
    });
    if (userScheduleQuery) {
      data.schedule = {
        connect: {
          id: schedule,
        },
      };
    }
  }
  // allows unsetting a schedule through { schedule: null, ... }
  else if (null === schedule || schedule === 0) {
    data.schedule = {
      disconnect: true,
    };
  }

  if (instantMeetingSchedule) {
    data.instantMeetingSchedule = {
      connect: {
        id: instantMeetingSchedule,
      },
    };
  } else if (schedule === null) {
    data.instantMeetingSchedule = {
      disconnect: true,
    };
  }

  const _membershipRepo = new MembershipRepository(ctx.prisma);

  if (restrictionScheduleId) {
    const scheduleRepo = new ScheduleRepository(ctx.prisma);
    const restrictionSchedule = await scheduleRepo.findScheduleByIdForOwnershipCheck({
      scheduleId: restrictionScheduleId,
    });
    if (restrictionSchedule?.userId !== ctx.user.id) {
      if (!currentCalIdTeamId || !restrictionSchedule) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The restriction schedule is not owned by you or your team",
        });
      }
      const hasCalIdMembership = await ctx.prisma.calIdMembership.findFirst({
        where: {
          calIdTeamId: currentCalIdTeamId,
          userId: restrictionSchedule.userId,
          acceptedInvitation: true,
        },
      });
      if (!hasCalIdMembership) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The restriction schedule is not owned by you or your team",
        });
      }
    }

    data.restrictionSchedule = {
      connect: {
        id: restrictionScheduleId,
      },
    };
  } else if (restrictionScheduleId === null || restrictionScheduleId === 0) {
    data.restrictionSchedule = {
      disconnect: true,
    };
  }

  if (users?.length) {
    data.users = {
      set: [],
      connect: users.map((userId: number) => ({ id: userId })),
    };
  }

  if (currentCalIdTeamId && hosts) {
    const calIdTeamMemberIds = await ctx.prisma.calIdMembership.findMany({
      where: {
        calIdTeamId: currentCalIdTeamId,
        acceptedInvitation: true,
      },
      select: {
        userId: true,
      },
    });
    const calIdTeamMemberIdList = calIdTeamMemberIds.map((member) => member.userId);

    if (!hosts.every((host) => calIdTeamMemberIdList.includes(host.userId))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not authorized to update this event type",
      });
    }

    const _isWeightsEnabled =
      isRRWeightsEnabled || (typeof isRRWeightsEnabled === "undefined" && eventType.isRRWeightsEnabled);

    const oldHostsSet = new Set(eventType.hosts.map((oldHost) => oldHost.userId));
    const newHostsSet = new Set(hosts.map((oldHost) => oldHost.userId));

    const existingHosts = hosts.filter((newHost) => oldHostsSet.has(newHost.userId));
    const newHosts = hosts.filter((newHost) => !oldHostsSet.has(newHost.userId));
    const removedHosts = eventType.hosts.filter((oldHost) => !newHostsSet.has(oldHost.userId));

    data.hosts = {
      deleteMany: {
        OR: removedHosts.map((host) => ({
          userId: host.userId,
          eventTypeId: id,
        })),
      },
      create: newHosts.map((host) => {
        return {
          ...host,
          isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
          priority: host.priority ?? 2,
          weight: host.weight ?? 100,
        };
      }),
      update: existingHosts.map((host) => ({
        where: {
          userId_eventTypeId: {
            userId: host.userId,
            eventTypeId: id,
          },
        },
        data: {
          isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
          priority: host.priority ?? 2,
          weight: host.weight ?? 100,
          scheduleId: host.scheduleId ?? null,
        },
      })),
    };
  }

  if (input.metadata?.disableStandardEmails?.all) {
    if (!eventType?.calIdTeam?.id) {
      input.metadata.disableStandardEmails.all.host = false;
      input.metadata.disableStandardEmails.all.attendee = false;
    }
  }

  if (input.metadata?.disableStandardEmails?.confirmation) {
    //check if user is allowed to disabled standard emails for calIdWorkflows
    const calIdWorkflows = await ctx.prisma.calIdWorkflow.findMany({
      where: {
        activeOn: {
          some: {
            eventTypeId: input.id,
          },
        },
        trigger: WorkflowTriggerEvents.NEW_EVENT,
      },
      select: {
        steps: true,
        trigger: true,
      },
    });

    if (input.metadata?.disableStandardEmails.confirmation?.host) {
      if (!canDisableOrganizerNotifications(calIdWorkflows)) {
        input.metadata.disableStandardEmails.confirmation.host = false;
      }
    }

    if (input.metadata?.disableStandardEmails.confirmation?.attendee) {
      if (!canDisableParticipantNotifications(calIdWorkflows)) {
        input.metadata.disableStandardEmails.confirmation.attendee = false;
      }
    }
  }

  const apps = eventTypeAppMetadataOptionalSchema.parse(input.metadata?.apps);
  for (const appKey in apps) {
    const app = apps[appKey as keyof typeof appDataSchemas];
    // There should only be one enabled payment app in the metadata
    if (app.enabled && app.price && app.currency && app.appCategories.includes("payment")) {
      data.price = app.price;
      data.currency = app.currency;
      break;
    }
  }
  console.log("multiplePrivateLinks", multiplePrivateLinks);
  // Handle multiple private links using the service
  const privateLinksRepo = HashedLinkRepository.create();
  const connectedLinks = await privateLinksRepo.findLinksByEventTypeId(input.id);
  console.log("connectedLinks", connectedLinks);
  const connectedMultiplePrivateLinks = connectedLinks.map((link) => link.link);

  const privateLinksService = new HashedLinkService();
  await privateLinksService.handleMultiplePrivateLinks({
    eventTypeId: input.id,
    multiplePrivateLinks,
    connectedMultiplePrivateLinks,
  });

  if (assignAllTeamMembers !== undefined) {
    data.assignAllTeamMembers = assignAllTeamMembers;
  }

  // Validate the secondary email
  if (secondaryEmailId) {
    const secondaryEmail = await ctx.prisma.secondaryEmail.findUnique({
      where: {
        id: secondaryEmailId,
        userId: ctx.user.id,
      },
    });
    // Make sure the secondary email id belongs to the current user and its a verified one
    if (secondaryEmail && secondaryEmail.emailVerified) {
      data.secondaryEmail = {
        connect: {
          id: secondaryEmailId,
        },
      };
      // Delete the data if the user selected his original email to send the events to, which means the value coming will be -1
    } else if (secondaryEmailId === -1) {
      data.secondaryEmail = {
        disconnect: true,
      };
    }
  }

  const parsedEventTypeLocations = eventTypeLocations.safeParse(eventType.locations ?? []);

  const isCalVideoLocationActive = locations
    ? locations.some((location) => location.type === DailyLocationType)
    : parsedEventTypeLocations.success &&
      parsedEventTypeLocations.data?.some((location) => location.type === DailyLocationType);

  if (eventType.calVideoSettings && !isCalVideoLocationActive) {
    await CalVideoSettingsRepository.deleteCalVideoSettings(id);
  }

  // Logic for updating `fieldTranslations`
  // user has no translations OR user is changing the field
  const hasNoDescriptionTranslations =
    eventType.fieldTranslations.filter((trans) => trans.field === EventTypeAutoTranslatedField.DESCRIPTION)
      .length === 0;
  const description = newDescription ?? (hasNoDescriptionTranslations ? eventType.description : undefined);
  const hasNoTitleTranslations =
    eventType.fieldTranslations.filter((trans) => trans.field === EventTypeAutoTranslatedField.TITLE)
      .length === 0;
  const title = newTitle ?? (hasNoTitleTranslations ? eventType.title : undefined);

  if (ctx.user.organizationId && autoTranslateDescriptionEnabled && (title || description)) {
    await tasker.create("translateEventTypeData", {
      eventTypeId: id,
      description,
      title,
      userLocale: ctx.user.locale,
      userId: ctx.user.id,
    });
  }

  const updatedEventTypeSelect = {
    slug: true,
    schedulingType: true,
  } satisfies Prisma.EventTypeSelect;
  let updatedEventType: Prisma.EventTypeGetPayload<{ select: typeof updatedEventTypeSelect }>;
  try {
    updatedEventType = await ctx.prisma.eventType.update({
      where: { id },
      data,
      select: updatedEventTypeSelect,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        // instead of throwing a 500 error, catch the conflict and throw a 400 error.
        throw new TRPCError({ message: "error_event_type_url_duplicate", code: "BAD_REQUEST" });
      }
    }
    throw e;
  }
  const updatedValues = Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      // @ts-expect-error Element implicitly has any type
      acc[key] = value;
    }
    return acc;
  }, {});

  if (
    !currentCalIdTeamId &&
    isPrismaObjOrUndefined(ctx.user.metadata)?.connectedChatAccounts &&
    ctx.user?.username
  ) {
    await handleOHChatSync({
      prismaClient: ctx.prisma,
      eventTypeId: eventType.id,
      userId: ctx.user.id,
      username: ctx.user?.username,
      updatedValues,
    });
  }

  // Handling updates to children event types (managed events types)
  await updateChildrenEventTypes({
    eventTypeId: id,
    currentUserId: ctx.user.id,
    oldEventType: {
      children: eventType.children,
      team: eventType.calIdTeam ? { name: eventType.calIdTeam.name } : null,
      workflows: eventType.calIdWorkflows,
    },
    updatedEventType,
    children,
    profileId: ctx.user.profile.id,
    prisma: ctx.prisma,
    updatedValues,
  });

  const res = ctx.res as NextApiResponse;
  if (typeof res?.revalidate !== "undefined") {
    try {
      await res?.revalidate(`/${ctx.user.username}/${updatedEventType.slug}`);
    } catch (e) {
      // if reach this it is because the event type page has not been created, so it is not possible to revalidate it
      logger.debug((e as Error)?.message);
    }
  }
  return { eventType };
};

const handleOHChatSync = async ({
  prismaClient,
  eventTypeId,
  username,
  updatedValues,
  userId,
}: {
  prismaClient: PrismaClient;
  eventTypeId: number;
  username: string;
  userId: number;
  updatedValues: Record<string, any>;
}): Promise<void> => {
  if (IS_DEV) return Promise.resolve();

  if (!updatedValues.slug && !updatedValues.title) return Promise.resolve();
  const credentials = await prismaClient.credential.findMany({
    where: {
      appId: "onehash-chat",
      userId,
    },
  });

  if (credentials.length == 0) return Promise.resolve();

  const account_user_ids: number[] = credentials.reduce<number[]>((acc, cred) => {
    const accountUserId = isPrismaObjOrUndefined(cred.key)?.account_user_id as number | undefined;
    if (accountUserId !== undefined) {
      acc.push(accountUserId);
    }
    return acc;
  }, []);

  if (account_user_ids.length === 0) return Promise.resolve();

  const updatedData = {
    account_user_ids,
    cal_events: [
      {
        uid: eventTypeId,
        ...(updatedValues.slug ? { url: `${WEBAPP_URL}/${username}/${updatedValues.slug}` } : {}),
        ...(updatedValues.title ? { title: updatedValues.title } : {}),
      },
    ],
  };

  await fetch(`${ONEHASH_CHAT_SYNC_BASE_URL}/cal_event`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ONEHASH_API_KEY}`,
    },
    body: JSON.stringify(updatedData),
  });
};
