import { EventTypeCustomInput, MembershipRole, PeriodType, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { z } from "zod";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";
import { _DestinationCalendarModel, _EventTypeCustomInputModel, _EventTypeModel } from "@calcom/prisma/zod";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { createEventTypeInput } from "@calcom/prisma/zod/custom/eventtype";
import { stripeDataSchema } from "@calcom/stripe/server";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";
import { viewerRouter } from "../viewer";

function isPeriodType(keyInput: string): keyInput is PeriodType {
  return Object.keys(PeriodType).includes(keyInput);
}

/**
 * Ensures that it is a valid HTTP URL
 * It automatically avoids
 * -  XSS attempts through javascript:alert('hi')
 * - mailto: links
 */
function assertValidUrl(url: string | null | undefined) {
  if (!url) {
    return;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new TRPCError({ code: "PARSE_ERROR", message: "Invalid URL" });
  }
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

const EventTypeUpdateInput = _EventTypeModel
  /** Optional fields */
  .extend({
    customInputs: z.array(_EventTypeCustomInputModel),
    destinationCalendar: _DestinationCalendarModel.pick({
      integration: true,
      externalId: true,
    }),
    users: z.array(stringOrNumber).optional(),
    schedule: z.number().optional(),
    hashedLink: z.string(),
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
        owner: teamId ? undefined : { connect: { id: userId } },
        users: {
          connect: {
            id: userId,
          },
        },
      };

      const appKeys = await getAppKeysFromSlug("daily-video");
      if (typeof appKeys.api_key === "string") {
        data.locations = [{ type: "integrations:daily" }];
      }

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

      try {
        const eventType = await ctx.prisma.eventType.create({ data });
        return { eventType };
      } catch (e) {
        if (e instanceof PrismaClientKnownRequestError) {
          if (e.code === "P2002" && Array.isArray(e.meta?.target) && e.meta?.target.includes("slug")) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "URL Slug already exists for given user." });
          }
        }
        throw e;
      }
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

    const inputUsers = (rawInput as any).users || [];

    const isAllowed = (function () {
      if (event.team) {
        const allTeamMembers = event.team.members.map((member) => member.userId);
        return inputUsers.every((userId: string) => allTeamMembers.includes(Number.parseInt(userId)));
      }
      return inputUsers.every((userId: string) => Number.parseInt(userId) === ctx.user.id);
    })();

    if (!isAllowed) {
      console.warn(`User ${ctx.user.id} attempted to an create an event for users ${inputUsers.join(", ")}.`);
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next();
  })
  .query("get", {
    input: z.object({
      id: z.number(),
    }),
    async resolve({ ctx, input }) {
      const user = await ctx.prisma.user.findUnique({
        where: {
          id: ctx.user.id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          startTime: true,
          endTime: true,
          bufferTime: true,
          avatar: true,
          plan: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return await ctx.prisma.eventType.findUnique({
        where: {
          id: input.id,
        },
        include: {
          team: true,
          users: true,
        },
      });
    },
  })
  .mutation("update", {
    input: EventTypeUpdateInput.strict(),
    async resolve({ ctx, input }) {
      const {
        schedule,
        periodType,
        locations,
        destinationCalendar,
        customInputs,
        recurringEvent,
        users,
        id,
        hashedLink,
        ...rest
      } = input;
      assertValidUrl(input.successRedirectUrl);
      const data: Prisma.EventTypeUpdateInput = rest;
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
      } else {
        data.recurringEvent = Prisma.DbNull;
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

      if (schedule) {
        data.schedule = {
          connect: {
            id: schedule,
          },
        };
      }

      if (users) {
        data.users = {
          set: [],
          connect: users.map((userId: number) => ({ id: userId })),
        };
      }

      if (input?.price) {
        const paymentCredential = await ctx.prisma.credential.findFirst({
          where: {
            userId: ctx.user.id,
            type: {
              contains: "_payment",
            },
          },
          select: {
            type: true,
            key: true,
          },
        });

        if (paymentCredential?.type === "stripe_payment") {
          const { default_currency } = stripeDataSchema.parse(paymentCredential.key);
          data.currency = default_currency;
        }
      }

      const connectedLink = await ctx.prisma.hashedLink.findFirst({
        where: {
          eventTypeId: input.id,
        },
        select: {
          id: true,
        },
      });

      if (hashedLink) {
        // check if hashed connection existed. If it did, do nothing. If it didn't, add a new connection
        if (!connectedLink) {
          // create a hashed link
          await ctx.prisma.hashedLink.upsert({
            where: {
              eventTypeId: input.id,
            },
            update: {
              link: hashedLink,
            },
            create: {
              link: hashedLink,
              eventType: {
                connect: { id: input.id },
              },
            },
          });
        }
      } else {
        // check if hashed connection exists. If it does, disconnect
        if (connectedLink) {
          await ctx.prisma.hashedLink.delete({
            where: {
              eventTypeId: input.id,
            },
          });
        }
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
