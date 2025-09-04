import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import type { NextApiResponse, GetServerSidePropsContext } from "next";

import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { DailyLocationType } from "@calcom/app-store/locations";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import {
  allowDisablingAttendeeConfirmationEmails,
  allowDisablingHostConfirmationEmails,
} from "@calcom/features/ee/workflows/lib/allowDisablingStandardEmails";
import tasker from "@calcom/features/tasker";
import { validateIntervalLimitOrder } from "@calcom/lib/intervalLimits/validateIntervalLimitOrder";
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
import {
  SchedulingType,
  EventTypeAutoTranslatedField,
  RRTimestampBasis,
  CreationSource,
} from "@calcom/prisma/enums";
import { MembershipRole } from "@calcom/prisma/enums";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import { eventTypeLocations } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import { setDestinationCalendarHandler } from "../../viewer/calendars/setDestinationCalendar.handler";
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
  userLevelSelectedCalendars: SessionUser["userLevelSelectedCalendars"];
  organizationId: number | null;
  email: SessionUser["email"];
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
    aiPhoneCallConfig,
    isRRWeightsEnabled,
    autoTranslateDescriptionEnabled,
    description: newDescription,
    title: newTitle,
    seatsPerTimeSlot,
    restrictionScheduleId,
    calVideoSettings,
    hostGroups,
    ...rest
  } = input;

  const eventType = await ctx.prisma.eventType.findUniqueOrThrow({
    where: { id },
    select: {
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
      workflows: {
        select: {
          workflowId: true,
        },
      },
      hostGroups: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          rrTimestampBasis: true,
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

  const finalSeatsPerTimeSlot =
    seatsPerTimeSlot === undefined ? eventType.seatsPerTimeSlot : seatsPerTimeSlot;
  const finalRecurringEvent = recurringEvent === undefined ? eventType.recurringEvent : recurringEvent;

  if (finalSeatsPerTimeSlot && finalRecurringEvent) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Recurring Events and Offer Seats cannot be active at the same time.",
    });
  }

  const teamId = input.teamId || eventType.team?.id;
  const guestsField = bookingFields?.find((field) => field.name === "guests");

  ensureUniqueBookingFields(bookingFields);
  ensureEmailOrPhoneNumberIsPresent(bookingFields);

  if (autoTranslateDescriptionEnabled && !ctx.user.organizationId) {
    logger.error(
      "Auto-translating description requires an organization. This should not happen - UI controls should prevent this state."
    );
  }

  const isLoadBalancingDisabled = !!(
    (eventType.team?.rrTimestampBasis && eventType.team?.rrTimestampBasis !== RRTimestampBasis.CREATED_AT) ||
    (hostGroups && hostGroups.length > 1) ||
    (!hostGroups && eventType.hostGroups && eventType.hostGroups.length > 1)
  );

  const data: Prisma.EventTypeUpdateInput = {
    ...rest,
    // autoTranslate feature is allowed for org users only
    autoTranslateDescriptionEnabled: !!(ctx.user.organizationId && autoTranslateDescriptionEnabled),
    description: newDescription,
    title: newTitle,
    bookingFields,
    maxActiveBookingsPerBooker,
    isRRWeightsEnabled,
    rrSegmentQueryValue:
      rest.rrSegmentQueryValue === null ? Prisma.DbNull : (rest.rrSegmentQueryValue as Prisma.InputJsonValue),
    metadata: rest.metadata === null ? Prisma.DbNull : (rest.metadata as Prisma.InputJsonObject),
    eventTypeColor: eventTypeColor === null ? Prisma.DbNull : (eventTypeColor as Prisma.InputJsonObject),
    disableGuests: guestsField?.hidden ?? false,
    seatsPerTimeSlot,
    maxLeadThreshold: isLoadBalancingDisabled ? null : rest.maxLeadThreshold,
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
    if (!id) throw new Error("Missing eventType id");
    data.customInputs = handleCustomInputs(customInputs, id);
  }

  if (bookingLimits) {
    const isValid = validateIntervalLimitOrder(bookingLimits);
    if (!isValid)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Booking limits must be in ascending order." });
    data.bookingLimits = bookingLimits;
  }

  if (maxActiveBookingsPerBooker) {
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

  const membershipRepo = new MembershipRepository(ctx.prisma);

  if (restrictionScheduleId) {
    // Verify that the user owns the restriction schedule or is a team member
    const scheduleRepo = new ScheduleRepository(ctx.prisma);
    const restrictionSchedule = await scheduleRepo.findScheduleByIdForOwnershipCheck({
      scheduleId: restrictionScheduleId,
    });
    // If the user doesn't own the schedule, check if they're a team member
    if (restrictionSchedule?.userId !== ctx.user.id) {
      if (!teamId || !restrictionSchedule) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "The restriction schedule is not owned by you or your team",
        });
      }
      const hasMembership = await membershipRepo.hasMembership({
        teamId,
        userId: restrictionSchedule.userId,
      });
      if (!hasMembership) {
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

  if (teamId && hosts) {
    const emailHosts = hosts.filter((h: { email?: string }) => typeof h.email === "string");
    const userHosts = hosts.filter((h: { userId?: number }) => typeof h.userId === "number");

    // handle invites for email hosts
    // Create verification tokens for team invites
    for (const invite of emailHosts) {
      if (!invite.email) continue;
      const normalizedEmail = invite.email.trim().toLowerCase();

      // Check if a verification token already exists for this email and team
      const existingToken = await ctx.prisma.verificationToken.findFirst({
        where: {
          identifier: normalizedEmail,
          teamId,
        },
      });

      if (!existingToken) {
        // Create a new verification token for team invite
        await ctx.prisma.verificationToken.create({
          data: {
            identifier: normalizedEmail,
            token: randomBytes(32).toString("hex"),
            expires: new Date(new Date().setHours(168)), // +1 week
            teamId,
          },
        });
      }
    }

    // Now process userHosts with your existing logic
    const memberships = await ctx.prisma.membership.findMany({
      where: {
        teamId,
        accepted: true,
      },
    });
    const teamMemberIds = memberships.map((m) => m.userId);

    if (
      !userHosts.every((host) => teamMemberIds.includes(host.userId as number)) &&
      !eventType.team?.parentId
    ) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const oldHostsSet = new Set(eventType.hosts.map((h) => h.userId));
    const newHostsSet = new Set(userHosts.map((h) => h.userId as number));
    const existingHosts = userHosts.filter((h) => oldHostsSet.has(h.userId as number));
    const newHosts = userHosts.filter((h) => !oldHostsSet.has(h.userId as number));
    const removedHosts = eventType.hosts.filter((h) => !newHostsSet.has(h.userId));

    data.hosts = {
      deleteMany: {
        OR: removedHosts.map((h) => ({
          userId: h.userId,
          eventTypeId: id,
        })),
      },
      create: newHosts
        .filter((h) => typeof h.userId === "number")
        .map((h) => ({
          ...h,
          isFixed: data.schedulingType === SchedulingType.COLLECTIVE || h.isFixed,
          priority: h.priority ?? 2,
          weight: h.weight ?? 100,
          userId: h.userId as number,
        })),
      update: existingHosts
        .filter((h) => typeof h.userId === "number")
        .map((h) => ({
          where: { userId_eventTypeId: { userId: h.userId as number, eventTypeId: id } },
          data: {
            isFixed: data.schedulingType === SchedulingType.COLLECTIVE || h.isFixed,
            priority: h.priority ?? 2,
            weight: h.weight ?? 100,
            scheduleId: h.scheduleId ?? null,
          },
        })),
    };
  }

  if (input.metadata?.disableStandardEmails?.all) {
    if (!eventType?.team?.parentId) {
      input.metadata.disableStandardEmails.all.host = false;
      input.metadata.disableStandardEmails.all.attendee = false;
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

    const apps = eventTypeAppMetadataOptionalSchema.parse(input.metadata?.apps);
    for (const appKey in apps) {
      const app = apps[appKey as keyof typeof appDataSchemas];
      // There should only be one enabled payment app in the metadata
      if (app.enabled && app.price && app.currency) {
        data.price = app.price;
        data.currency = app.currency;
        break;
      }
    }
    // Handle multiple private links using the service
    const privateLinksRepo = HashedLinkRepository.create();
    const connectedLinks = await privateLinksRepo.findLinksByEventTypeId(input.id);
    const connectedMultiplePrivateLinks = connectedLinks.map((link) => link.link);

    const privateLinksService = new HashedLinkService();
    await privateLinksService.handleMultiplePrivateLinks({
      eventTypeId: input.id,
      multiplePrivateLinks,
      connectedMultiplePrivateLinks,
    });
    // Unified host processing block
    if (teamId && hosts) {
      // Separate userId-based and email-based hosts
      const userIdHosts = hosts.filter((host) => host.userId);
      const emailHosts = hosts.filter((host) => host.email && host.isPending);

      // Validate userId hosts are team members (unless sub-team)
      const teamMemberIds = await membershipRepo.listAcceptedTeamMemberIds({ teamId });
      if (
        !userIdHosts.every((host) => teamMemberIds.includes(host.userId as number)) &&
        !eventType.team?.parentId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }

      // Invite email hosts to team as Members
      if (emailHosts.length > 0) {
        const { inviteMembersWithNoInviterPermissionCheck } = await import(
          "../teams/inviteMember/inviteMember.handler"
        );
        try {
          await inviteMembersWithNoInviterPermissionCheck({
            inviterName: ctx.user?.username ?? null,
            teamId: teamId,
            language: ctx.user.locale || "en",
            creationSource: CreationSource.WEBAPP,
            orgSlug: eventType.team?.slug || null,
            invitations: emailHosts
              .filter((host) => typeof host.email === "string" && host.email)
              .map((host) => ({
                usernameOrEmail: host.email as string,
                role: MembershipRole.MEMBER,
              })),
            isDirectUserAction: false,
          });
        } catch (error) {
          console.warn("Failed to invite some email hosts:", error);
        }
      }

      // Compute create/update/delete for hosts, including scheduleId/groupId
      const allHosts = [...userIdHosts, ...emailHosts];
      const oldHostsSet = new Set(eventType.hosts.map((oldHost) => oldHost.userId));
      const newHostsSet = new Set(allHosts.filter((h) => h.userId).map((host) => host.userId));

      const existingHosts = allHosts.filter((newHost) => newHost.userId && oldHostsSet.has(newHost.userId));
      const newHosts = allHosts.filter((newHost) => !newHost.userId || !oldHostsSet.has(newHost.userId));
      const removedHosts = eventType.hosts.filter((oldHost) => !newHostsSet.has(oldHost.userId));

      data.hosts = {
        deleteMany: {
          OR: removedHosts.map((host) => ({
            userId: host.userId,
            eventTypeId: id,
          })),
        },
        create: newHosts
          .filter((host) => typeof host.userId === "number")
          .map((host) => ({
            isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
            priority: host.priority ?? 2,
            weight: host.weight ?? 100,
            scheduleId: host.scheduleId ?? null,
            groupId: host.groupId,
            user: { connect: { id: host.userId as number } },
          })),
        update: existingHosts
          .filter((host) => typeof host.userId === "number")
          .map((host) => ({
            where: {
              userId_eventTypeId: {
                userId: host.userId as number,
                eventTypeId: id,
              },
            },
            data: {
              isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
              priority: host.priority ?? 2,
              weight: host.weight ?? 100,
              scheduleId: host.scheduleId ?? null,
              groupId: host.groupId,
            },
          })),
      };
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

  if (calVideoSettings) {
    await CalVideoSettingsRepository.createOrUpdateCalVideoSettings({
      eventTypeId: id,
      calVideoSettings,
    });
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

  // Clean up empty host groups
  if (hostGroups !== undefined || hosts) {
    await ctx.prisma.hostGroup.deleteMany({
      where: {
        eventTypeId: id,
        hosts: {
          none: {},
        },
      },
    });
  }

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
