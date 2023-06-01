import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { NextApiResponse, GetServerSidePropsContext } from "next";

import { stripeDataSchema } from "@calcom/app-store/stripepayment/lib/server";
import updateChildrenEventTypes from "@calcom/features/ee/managed-event-types/lib/handleChildrenEventTypes";
import { validateIntervalLimitOrder } from "@calcom/lib";
import logger from "@calcom/lib/logger";
import { WorkflowActions, WorkflowTriggerEvents } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import { setDestinationCalendarHandler } from "../../loggedInViewer/setDestinationCalendar.handler";
import type { TUpdateInputSchema } from "./update.schema";
import { ensureUniqueBookingFields, handleCustomInputs, handlePeriodType } from "./util";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
    prisma: PrismaClient;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ ctx, input }: UpdateOptions) => {
  const {
    schedule,
    periodType,
    locations,
    bookingLimits,
    durationLimits,
    destinationCalendar,
    customInputs,
    recurringEvent,
    users,
    children,
    hosts,
    id,
    hashedLink,
    // Extract this from the input so it doesn't get saved in the db
    // eslint-disable-next-line
    userId,
    // eslint-disable-next-line
    teamId,
    bookingFields,
    offsetStart,
    ...rest
  } = input;

  ensureUniqueBookingFields(bookingFields);

  const data: Prisma.EventTypeUpdateInput = {
    ...rest,
    bookingFields,
    metadata: rest.metadata === null ? Prisma.DbNull : (rest.metadata as Prisma.InputJsonObject),
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

  if (users?.length) {
    data.users = {
      set: [],
      connect: users.map((userId: number) => ({ id: userId })),
    };
  }

  if (hosts) {
    data.hosts = {
      deleteMany: {},
      create: hosts.map((host) => ({
        ...host,
        isFixed: data.schedulingType === SchedulingType.COLLECTIVE || host.isFixed,
      })),
    };
  }

  if (input.metadata?.disableStandardEmails) {
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
      if (
        !workflows.find(
          (workflow) => !!workflow.steps.find((step) => step.action === WorkflowActions.EMAIL_HOST)
        )
      ) {
        input.metadata.disableStandardEmails.confirmation.host = false;
      }
    }

    if (input.metadata?.disableStandardEmails.confirmation?.attendee) {
      if (
        !workflows.find(
          (workflow) => !!workflow.steps.find((step) => step.action === WorkflowActions.EMAIL_ATTENDEE)
        )
      ) {
        input.metadata.disableStandardEmails.confirmation.attendee = false;
      }
    }
  }

  if (input?.price || input.metadata?.apps?.stripe?.price) {
    data.price = input.price || input.metadata?.apps?.stripe?.price;
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
  const [oldEventType, eventType] = await ctx.prisma.$transaction([
    ctx.prisma.eventType.findFirst({
      where: { id },
      select: {
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
            name: true,
          },
        },
      },
    }),
    ctx.prisma.eventType.update({
      where: { id },
      data,
    }),
  ]);

  // Handling updates to children event types (managed events types)
  await updateChildrenEventTypes({
    eventTypeId: id,
    currentUserId: ctx.user.id,
    oldEventType,
    hashedLink,
    connectedLink,
    updatedEventType: eventType,
    children,
    prisma: ctx.prisma,
  });
  const res = ctx.res as NextApiResponse;
  if (typeof res?.revalidate !== "undefined") {
    try {
      await res?.revalidate(`/${ctx.user.username}/${eventType.slug}`);
    } catch (e) {
      // if reach this it is because the event type page has not been created, so it is not possible to revalidate it
      logger.debug((e as Error)?.message);
    }
  }
  return { eventType };
};
