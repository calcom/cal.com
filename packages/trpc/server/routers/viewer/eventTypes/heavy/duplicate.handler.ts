import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { CalVideoSettingsRepository } from "@calcom/features/calVideoSettings/repositories/CalVideoSettingsRepository";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - descriptionAsSafeHTML is added on the fly using a prisma middleware it shouldn't be used to create event type. Such a property doesn't exist on schema
      descriptionAsSafeHTML: _descriptionAsSafeHTML,
      secondaryEmailId,
      instantMeetingScheduleId: _instantMeetingScheduleId,
      restrictionScheduleId: _restrictionScheduleId,
      calVideoSettings,
      ...rest
    } = eventType;

    const data: Prisma.EventTypeCreateInput = {
      ...rest,
      title: newEventTitle,
      slug: newSlug,
      description: newDescription,
      length: newLength,
      locations: locations ?? undefined,
      team: team ? { connect: { id: team.id } } : undefined,
      users: users ? { connect: users.map((user) => ({ id: user.id })) } : undefined,
      hosts: hosts
        ? {
            createMany: {
              data: hosts.map(({ eventTypeId: _, ...rest }) => rest),
            },
          }
        : undefined,
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

    // Validate the secondary email
    if (secondaryEmailId) {
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
      const relationCreateData = workflows.map((workflow) => {
        return { eventTypeId: newEventType.id, workflowId: workflow.workflowId };
      });

      await prisma.workflowsOnEventTypes.createMany({
        data: relationCreateData,
      });
    }
    if (destinationCalendar) {
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
