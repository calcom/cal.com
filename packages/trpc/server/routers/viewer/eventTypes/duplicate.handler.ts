import { Prisma } from "@prisma/client";

import { generateHashedLink } from "@calcom/lib/generateHashedLink";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { setDestinationCalendarHandler } from "../../loggedInViewer/setDestinationCalendar.handler";
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
      },
    });

    if (!eventType) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Validate user is owner of event type or in the team
    if (eventType.userId !== ctx.user.id) {
      if (eventType.teamId) {
        const isMember = await prisma.membership.findFirst({
          where: {
            userId: ctx.user.id,
            teamId: eventType.teamId,
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
      metadata,
      workflows,
      hashedLink,
      destinationCalendar,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      webhooks: _webhooks,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      schedule: _schedule,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment
      // @ts-ignore - descriptionAsSafeHTML is added on the fly using a prisma middleware it shouldn't be used to create event type. Such a property doesn't exist on schema
      descriptionAsSafeHTML: _descriptionAsSafeHTML,
      secondaryEmailId,
      instantMeetingScheduleId: _instantMeetingScheduleId,
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

      recurringEvent: recurringEvent || undefined,
      bookingLimits: bookingLimits ?? undefined,
      durationLimits: durationLimits ?? undefined,
      eventTypeColor: eventTypeColor ?? undefined,
      metadata: metadata === null ? Prisma.DbNull : metadata,
      bookingFields: eventType.bookingFields === null ? Prisma.DbNull : eventType.bookingFields,
      rrSegmentQueryValue:
        eventType.rrSegmentQueryValue === null ? Prisma.DbNull : eventType.rrSegmentQueryValue,
      assignRRMembersUsingSegment: eventType.assignRRMembersUsingSegment,
    };

    // Validate the secondary email
    if (!!secondaryEmailId) {
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

    const newEventType = await EventTypeRepository.create(data);

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

    if (hashedLink) {
      await prisma.hashedLink.create({
        data: {
          link: generateHashedLink(users[0]?.id ?? newEventType.teamId),
          eventType: {
            connect: { id: newEventType.id },
          },
        },
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
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Error duplicating event type ${error}` });
  }
};
