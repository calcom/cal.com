import { EventTypeCustomInput, MembershipRole, PeriodType, Prisma } from "@prisma/client";
import { z } from "zod";

import {
  _AvailabilityModel,
  _DestinationCalendarModel,
  _EventTypeCustomInputModel,
  _EventTypeModel,
} from "@calcom/prisma/zod";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { createEventTypeInput } from "@calcom/prisma/zod/eventtypeCustom";

import { createProtectedRouter } from "@server/createRouter";
import { viewerRouter } from "@server/routers/viewer";
import { TRPCError } from "@trpc/server";

function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

function handlePeriodType(periodType: string | undefined): PeriodType | undefined {
  if (typeof periodType !== "string") return undefined;
  const passedPeriodType = periodType.toUpperCase();
  if (!isPeriodType(passedPeriodType)) return undefined;
  return PeriodType[passedPeriodType];
}

function handleCustomInputs(customInputs: EventTypeCustomInput[], eventTypeId: number) {
  const cInputsIdsToDelete = customInputs.filter((input) => input.id > 0).map((e) => e.id);
  const cInputsToCreate = customInputs
    .filter((input) => input.id < 0)
    .map((input) => ({
      type: input.type,
      label: input.label,
      required: input.required,
      placeholder: input.placeholder,
    }));
  const cInputsToUpdate = customInputs
    .filter((input) => input.id > 0)
    .map((input) => ({
      data: {
        type: input.type,
        label: input.label,
        required: input.required,
        placeholder: input.placeholder,
      },
      where: {
        id: input.id,
      },
    }));

  return {
    deleteMany: {
      eventTypeId,
      NOT: {
        id: { in: cInputsIdsToDelete },
      },
    },
    createMany: {
      data: cInputsToCreate,
    },
    update: cInputsToUpdate,
  };
}

const AvailabilityInput = _AvailabilityModel.pick({
  days: true,
  startTime: true,
  endTime: true,
});

const EventTypeUpdateInput = _EventTypeModel
  /** Optional fields */
  .extend({
    availability: z
      .object({
        openingHours: z.array(AvailabilityInput).optional(),
        dateOverrides: z.array(AvailabilityInput).optional(),
      })
      .optional(),
    customInputs: z.array(_EventTypeCustomInputModel),
    destinationCalendar: _DestinationCalendarModel.pick({
      integration: true,
      externalId: true,
    }),
    users: z.array(stringOrNumber).optional(),
  })
  .partial()
  .merge(
    _EventTypeModel
      /** Required fields */
      .pick({
        id: true,
      })
  );

export const eventTypesRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      return await ctx.prisma.webhook.findMany({
        where: {
          userId: ctx.user.id,
        },
      });
    },
  })
  .mutation("create", {
    input: createEventTypeInput,
    async resolve({ ctx, input }) {
      const { schedulingType, teamId, ...rest } = input;

      const userId = ctx.user.id;

      const data: Prisma.EventTypeCreateInput = {
        ...rest,
        users: {
          connect: {
            id: userId,
          },
        },
      };

      if (teamId && schedulingType) {
        const hasMembership = await ctx.prisma.membership.findFirst({
          where: {
            userId,
            teamId: teamId,
            accepted: true,
          },
        });

        if (!hasMembership) {
          console.warn(`User ${userId} does not have permission to create this new event type`);
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        data.team = {
          connect: {
            id: teamId,
          },
        };
        data.schedulingType = schedulingType;
      }

      const eventType = await ctx.prisma.eventType.create({ data });

      return { eventType };
    },
  })
  // Prevent non-owners to update/delete a team event
  .middleware(async ({ ctx, rawInput, next }) => {
    const event = await ctx.prisma.eventType.findUnique({
      where: { id: (rawInput as Record<"id", number>)?.id },
      include: {
        users: true,
        team: {
          select: {
            members: {
              select: {
                userId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const isAuthorized = (function () {
      if (event.team) {
        return event.team.members
          .filter((member) => member.role === MembershipRole.OWNER || member.role === MembershipRole.ADMIN)
          .map((member) => member.userId)
          .includes(ctx.user.id);
      }
      return event.userId === ctx.user.id || event.users.find((user) => user.id === ctx.user.id);
    })();

    if (!isAuthorized) {
      console.warn(`User ${ctx.user.id} attempted to an access an event ${event.id} they do not own.`);
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next();
  })
  .mutation("update", {
    input: EventTypeUpdateInput.strict(),
    async resolve({ ctx, input }) {
      const { availability, periodType, locations, destinationCalendar, customInputs, users, id, ...rest } =
        input;
      const data: Prisma.EventTypeUpdateInput = rest;
      data.locations = locations ?? undefined;

      if (periodType) {
        data.periodType = handlePeriodType(periodType);
      }

      if (destinationCalendar) {
        /** We connect or create a destination calendar to the event type instead of the user */
        await viewerRouter.createCaller(ctx).mutation("setDestinationCalendar", {
          ...destinationCalendar,
          eventTypeId: id,
        });
      }

      if (customInputs) {
        data.customInputs = handleCustomInputs(customInputs, id);
      }

      if (users) {
        data.users = {
          set: [],
          connect: users.map((userId) => ({ id: userId })),
        };
      }

      if (availability?.openingHours) {
        await ctx.prisma.availability.deleteMany({
          where: {
            eventTypeId: input.id,
          },
        });

        data.availability = {
          createMany: {
            data: availability.openingHours,
          },
        };
      }

      const eventType = await ctx.prisma.eventType.update({
        where: { id },
        data,
      });

      return { eventType };
    },
  })
  .mutation("delete", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx, input }) {
      const { id } = input;

      await ctx.prisma.eventTypeCustomInput.deleteMany({
        where: {
          eventTypeId: id,
        },
      });

      await ctx.prisma.eventType.delete({
        where: {
          id,
        },
      });

      return {
        id,
      };
    },
  });
