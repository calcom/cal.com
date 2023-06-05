import { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
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
        users: true,
        team: true,
        workflows: true,
        webhooks: true,
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
      recurringEvent,
      bookingLimits,
      durationLimits,
      metadata,
      workflows,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      id: _id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      webhooks: _webhooks,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      schedule: _schedule,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment
      // @ts-ignore - descriptionAsSafeHTML is added on the fly using a prisma middleware it shouldn't be used to create event type. Such a property doesn't exist on schema
      descriptionAsSafeHTML: _descriptionAsSafeHTML,
      ...rest
    } = eventType;

    const data: Prisma.EventTypeUncheckedCreateInput = {
      ...rest,
      title: newEventTitle,
      slug: newSlug,
      description: newDescription,
      length: newLength,
      locations: locations ?? undefined,
      teamId: team ? team.id : undefined,
      users: users ? { connect: users.map((user) => ({ id: user.id })) } : undefined,
      recurringEvent: recurringEvent || undefined,
      bookingLimits: bookingLimits ?? undefined,
      durationLimits: durationLimits ?? undefined,
      metadata: metadata === null ? Prisma.DbNull : metadata,
      bookingFields: eventType.bookingFields === null ? Prisma.DbNull : eventType.bookingFields,
    };

    const newEventType = await prisma.eventType.create({ data });

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

    if (workflows.length > 0) {
      const relationCreateData = workflows.map((workflow) => {
        return { eventTypeId: newEventType.id, workflowId: workflow.workflowId };
      });

      await prisma.workflowsOnEventTypes.createMany({
        data: relationCreateData,
      });
    }

    return {
      eventType: newEventType,
    };
  } catch (error) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
};
