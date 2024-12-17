import { Prisma } from "@prisma/client";
import type { NextApiResponse, GetServerSidePropsContext } from "next";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import tasker from "@calcom/features/tasker";
import { validateIntervalLimitOrder } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server";
import { validateBookerLayouts } from "@calcom/lib/validateBookerLayouts";
import type { PrismaClient } from "@calcom/prisma";
import { WorkflowTriggerEvents } from "@calcom/prisma/client";
import { SchedulingType, EventTypeAutoTranslatedField } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { setDestinationCalendarHandler } from "../../loggedInViewer/setDestinationCalendar.handler";
import type { TUpdateInputSchema } from "./update.schema";
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
  selectedCalendars: SessionUser["selectedCalendars"];
  organizationId: number | null;
  locale: string;
};

type UpdateOptions = {
  ctx: {
    user: User;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
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
    aiPhoneCallConfig,
    isRRWeightsEnabled,
    autoTranslateDescriptionEnabled,
    description: newDescription,
    title: newTitle,
    ...rest
  } = input;

  const eventType = await ctx.prisma.eventType.findUniqueOrThrow({
    where: { id },
    select: {
      title: true,
      description: true,
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
      children: {
        select: {
          userId: true,
        },
      },
      workflows: {
        select: {
          workflowId: true,
        },
      },
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

  if (input.teamId && eventType.team?.id && input.teamId !== eventType.team.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const teamId = input.teamId || eventType.team?.id;

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
  else if (null === schedule) {
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

  if (users?.length) {
    data.users = {
      set: [],
      connect: users.map((userId: number) => ({ id: userId })),
    };
  }

  if (teamId && hosts) {
    // check if all hosts can be assigned (memberships that have accepted invite)
    const memberships =
      (await ctx.prisma.membership.findMany({
        where: {
          teamId,
          accepted: true,
        },
      })) || [];
    const teamMemberIds = memberships.map((membership) => membership.userId);
    // guard against missing IDs, this may mean a member has just been removed
    // or this request was forged.
    // we let this pass through on organization sub-teams
    if (!hosts.every((host) => teamMemberIds.includes(host.userId)) && !eventType.team?.parentId) {
      throw new TRPCError({
        code: "FORBIDDEN",
      });
    }

    // weights were already enabled or are enabled now
    const isWeightsEnabled =
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
    if (!eventType?.team?.parentId) {
      input.metadata.disableStandardEmails.all.host = false;
      input.metadata.disableStandardEmails.all.attendee = false;
    }
  }

  if (input.metadata?.disableStandardEmails?.confirmation) {
    //check if user is allowed to disabled standard emails
    const workflows = await ctx.prisma.workflow.findMany({
      where: {
        activeOn: {
          some: {
            eventTypeId: input.id,
          },
        },
        trigger: WorkflowTriggerEvents.NEW_EVENT,
      },
      include: {
        steps: true,
      },
    });

    if (input.metadata?.disableStandardEmails.confirmation?.host) {
      if (!allowDisablingHostConfirmationEmails(workflows)) {
        input.metadata.disableStandardEmails.confirmation.host = false;
      }
    }

    if (input.metadata?.disableStandardEmails.confirmation?.attendee) {
      if (!allowDisablingAttendeeConfirmationEmails(workflows)) {
        input.metadata.disableStandardEmails.confirmation.attendee = false;
      }
    }
  }

  for (const appKey in input.metadata?.apps) {
    const app = input.metadata?.apps[appKey as keyof typeof appDataSchemas];
    // There should only be one enabled payment app in the metadata
    if (app.enabled && app.price && app.currency) {
      data.price = app.price;
      data.currency = app.currency;
      break;
    }
  }
  const connectedLinks = await ctx.prisma.hashedLink.findMany({
    where: {
      eventTypeId: input.id,
    },
    select: {
      id: true,
      link: true,
    },
  });

  const connectedMultiplePrivateLinks = connectedLinks.map((link) => link.link);

  if (multiplePrivateLinks && multiplePrivateLinks.length > 0) {
    const multiplePrivateLinksToBeInserted = multiplePrivateLinks.filter(
      (link) => !connectedMultiplePrivateLinks.includes(link)
    );
    const singleLinksToBeDeleted = connectedMultiplePrivateLinks.filter(
      (link) => !multiplePrivateLinks.includes(link)
    );
    if (singleLinksToBeDeleted.length > 0) {
      await ctx.prisma.hashedLink.deleteMany({
        where: {
          eventTypeId: input.id,
          link: {
            in: singleLinksToBeDeleted,
          },
        },
      });
    }
    if (multiplePrivateLinksToBeInserted.length > 0) {
      await ctx.prisma.hashedLink.createMany({
        data: multiplePrivateLinksToBeInserted.map((link) => {
          return {
            link: link,
            eventTypeId: input.id,
          };
        }),
      });
    }
  } else {
    // Delete all the single-use links for this event.
    if (connectedMultiplePrivateLinks.length > 0) {
      await ctx.prisma.hashedLink.deleteMany({
        where: {
          eventTypeId: input.id,
          link: {
            in: connectedMultiplePrivateLinks,
          },
        },
      });
    }
  }

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

  if (aiPhoneCallConfig) {
    if (aiPhoneCallConfig.enabled) {
      await ctx.prisma.aIPhoneCallConfiguration.upsert({
        where: {
          eventTypeId: id,
        },
        update: {
          ...aiPhoneCallConfig,
          guestEmail: !!aiPhoneCallConfig?.guestEmail ? aiPhoneCallConfig.guestEmail : null,
          guestCompany: !!aiPhoneCallConfig?.guestCompany ? aiPhoneCallConfig.guestCompany : null,
        },
        create: {
          ...aiPhoneCallConfig,
          guestEmail: !!aiPhoneCallConfig?.guestEmail ? aiPhoneCallConfig.guestEmail : null,
          guestCompany: !!aiPhoneCallConfig?.guestCompany ? aiPhoneCallConfig.guestCompany : null,
          eventTypeId: id,
        },
      });
    } else if (!aiPhoneCallConfig.enabled && eventType.aiPhoneCallConfig) {
      await ctx.prisma.aIPhoneCallConfiguration.delete({
        where: {
          eventTypeId: id,
        },
      });
    }
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

  const updatedEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
    slug: true,
    schedulingType: true,
  });
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

  // Handling updates to children event types (managed events types)
  await updateChildrenEventTypes({
    eventTypeId: id,
    currentUserId: ctx.user.id,
    oldEventType: eventType,
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
