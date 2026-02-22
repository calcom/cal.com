import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { CalVideoSettingsRepository } from "@calcom/features/calVideoSettings/repositories/CalVideoSettingsRepository";
import { duplicateWorkflow } from "@calcom/features/ee/workflows/lib/duplicateWorkflow";
import { prisma } from "@calcom/prisma";
import { Prisma, MembershipRole } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import { setDestinationCalendarHandler } from "../../../viewer/calendars/setDestinationCalendar.handler";
import type { TDuplicateInputSchema } from "./duplicate.schema";

type DuplicateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDuplicateInputSchema;
};

export const duplicateHandler = async ({ ctx, input }: DuplicateOptions) => {
  try {
    const {
      id: originalEventTypeId,
      title: newEventTitle,
      slug: newSlug,
      description: newDescription,
      length: newLength,
      targetTeamId,
    } = input;
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: originalEventTypeId,
      },
      include: {
        customInputs: true,
        schedule: true,
        users: {
          select: {
            id: true,
          },
        },
        hosts: true,
        team: true,
        workflows: true,
        webhooks: true,
        hashedLink: true,
        destinationCalendar: true,
        calVideoSettings: {
          select: {
            disableRecordingForOrganizer: true,
            disableRecordingForGuests: true,
            enableAutomaticTranscription: true,
            enableAutomaticRecordingForOrganizer: true,
            requireEmailForGuests: true,
            redirectUrlOnExit: true,
            disableTranscriptionForGuests: true,
            disableTranscriptionForOrganizer: true,
          },
        },
      },
    });

    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Validate user is owner of event type or in the team
    if (eventType.userId !== ctx.user.id) {
      if (eventType.teamId) {
        const isMember = await prisma.membership.findUnique({
          where: {
            userId_teamId: {
              userId: ctx.user.id,
              teamId: eventType.teamId,
            },
          },
        });
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
    }

    // If duplicating to a different team, validate user has ADMIN/OWNER role in the target team
    if (targetTeamId) {
      const targetMembership = await prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: ctx.user.id,
            teamId: targetTeamId,
          },
        },
      });
      if (!targetMembership || ![MembershipRole.ADMIN, MembershipRole.OWNER].includes(targetMembership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be an admin or owner of the target team to duplicate event types to it.",
        });
      }
    }


    const {
      customInputs,
      users,
      locations,
      team,
      hosts,
      recurringEvent,
      bookingLimits,
      durationLimits,
      eventTypeColor,
      customReplyToEmail,
      metadata,
      workflows,
      hashedLink,
      destinationCalendar,

      id: _id,

      webhooks: _webhooks,

      schedule: _schedule,
      // @ts-expect-error - descriptionAsSafeHTML is added on the fly using a prisma middleware it shouldn't be used to create event type. Such a property doesn't exist on schema
      descriptionAsSafeHTML: _descriptionAsSafeHTML,
      secondaryEmailId,
      instantMeetingScheduleId: _instantMeetingScheduleId,
      restrictionScheduleId: _restrictionScheduleId,
      calVideoSettings,
      ...rest
    } = eventType;

    const isExplicitTarget = targetTeamId !== undefined;
    const destinationTeamId = isExplicitTarget ? targetTeamId : team?.id;
    const isDuplicatingToTeam = !!destinationTeamId;
    const shouldResetToCurrentUser = isExplicitTarget;

    let usersInput: Prisma.EventTypeCreateInput["users"];
    if (shouldResetToCurrentUser) {
      usersInput = { connect: [{ id: ctx.user.id }] };
    } else if (users) {
      usersInput = { connect: users.map((user) => ({ id: user.id })) };
    }

    let hostsInput: Prisma.EventTypeCreateInput["hosts"];
    if (shouldResetToCurrentUser) {
      hostsInput = {
        createMany: {
          data: [{ userId: ctx.user.id, isFixed: true }],
        },
      };
    } else if (hosts) {
      hostsInput = {
        createMany: {
          data: hosts.map(({ eventTypeId: _, ...rest }) => rest),
        },
      };
    }

    const data: Prisma.EventTypeCreateInput = {
      ...rest,
      title: newEventTitle,
      slug: newSlug,
      description: newDescription,
      length: newLength,
      locations: locations ?? undefined,
      team: destinationTeamId ? { connect: { id: destinationTeamId } } : undefined,
      // When duplicating explicitly (changing context), connect the current user; otherwise preserve original users
      users: usersInput,
      // When duplicating explicitly, add the current user as a host; otherwise preserve original hosts
      hosts: hostsInput,
      // When duplicating to a team, set scheduling type to ROUND_ROBIN by default. If personal, null.
      schedulingType: isDuplicatingToTeam
        ? rest.schedulingType ?? SchedulingType.ROUND_ROBIN
        : null,
      restrictionSchedule: _restrictionScheduleId
        ? {
            connect: {
              id: _restrictionScheduleId,
            },
          }
        : undefined,
      recurringEvent: recurringEvent || undefined,
      bookingLimits: bookingLimits ?? undefined,
      durationLimits: durationLimits ?? undefined,
      eventTypeColor: eventTypeColor ?? undefined,
      customReplyToEmail: customReplyToEmail ?? undefined,
      metadata: metadata === null ? Prisma.DbNull : metadata,
      bookingFields: eventType.bookingFields === null ? Prisma.DbNull : eventType.bookingFields,
      rrSegmentQueryValue:
        eventType.rrSegmentQueryValue === null ? Prisma.DbNull : eventType.rrSegmentQueryValue,
      assignRRMembersUsingSegment: eventType.assignRRMembersUsingSegment,
    };

    // When duplicating to a team, clear personal fields that don't apply
    if (isDuplicatingToTeam) {
      data.userId = null;
    } else if (shouldResetToCurrentUser) {
      data.userId = ctx.user.id;
    }

    // Validate the secondary email
    if (secondaryEmailId && !isDuplicatingToTeam) {
      const secondaryEmail = await prisma.secondaryEmail.findUnique({
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
      }
    }

    const eventTypeRepo = new EventTypeRepository(prisma);
    const newEventType = await eventTypeRepo.create(data);

    // Create custom inputs
    if (customInputs) {
      const customInputsData = customInputs.map((customInput) => {
        const { id: _, options, ...rest } = customInput;
        return {
          options: options ?? undefined,
          ...rest,
          eventTypeId: newEventType.id,
        };
      });
      await prisma.eventTypeCustomInput.createMany({
        data: customInputsData,
      });
    }

    if (hashedLink.length > 0) {
      const newHashedLinksData = hashedLink.map((originalLink, index) => ({
        link: generateHashedLink(
          `${users[0]?.id ?? newEventType.teamId ?? originalLink.eventTypeId}-${index}`
        ),
        eventTypeId: newEventType.id,
        expiresAt: originalLink.expiresAt,
        maxUsageCount: originalLink.maxUsageCount,
      }));
      await prisma.hashedLink.createMany({
        data: newHashedLinksData,
      });
    }

    if (calVideoSettings) {
      await CalVideoSettingsRepository.createCalVideoSettings({
        eventTypeId: newEventType.id,
        calVideoSettings,
      });
    }

    if (workflows.length > 0) {
      for (const workflowLink of workflows) {
        const newWorkflow = await duplicateWorkflow({
          workflowId: workflowLink.workflowId,
          targetTeamId,
          currentUserId: ctx.user.id,
        });

        await prisma.workflowsOnEventTypes.create({
          data: {
            eventTypeId: newEventType.id,
            workflowId: newWorkflow.id,
          },
        });
      }
    }
    if (destinationCalendar && !isDuplicatingToTeam) {
      await setDestinationCalendarHandler({
        ctx,
        input: {
          ...destinationCalendar,
          eventTypeId: newEventType.id,
        },
      });
    }

    return {
      eventType: newEventType,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (Array.isArray(error.meta?.target) && error.meta?.target.includes("slug")) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "duplicate_event_slug_conflict",
        });
      }

      throw new TRPCError({
        code: "CONFLICT",
        message: "Unique constraint violation while creating a duplicate event.",
      });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error duplicating event type ${error}` });
  }
};

