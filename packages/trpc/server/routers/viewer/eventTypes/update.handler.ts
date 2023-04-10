import { Prisma, SchedulingType } from "@prisma/client";
import type { NextApiResponse, GetServerSidePropsContext } from "next";

import { stripeDataSchema } from "@calcom/app-store/stripepayment/lib/server";
import { validateIntervalLimitOrder } from "@calcom/lib";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";
import { ensureUniqueBookingFields, handleCustomInputs, handlePeriodType } from "./util";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
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
    users = [],
    hosts,
    id,
    hashedLink,
    // Extract this from the input so it doesn't get saved in the db
    // eslint-disable-next-line
    userId,
    // eslint-disable-next-line
    teamId,
    bookingFields,
    ...rest
  } = input;

  ensureUniqueBookingFields(bookingFields);

  const data: Prisma.EventTypeUpdateInput = {
    ...rest,
    bookingFields,
    metadata: rest.metadata === null ? Prisma.DbNull : rest.metadata,
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
    // !: Come back to this
    // await viewerRouter.createCaller(ctx).setDestinationCalendar({
    //   ...destinationCalendar,
    //   eventTypeId: id,
    // });
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

  if (schedule) {
    // Check that the schedule belongs to the user
    const userScheduleQuery = await prisma.schedule.findFirst({
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

  if (users.length) {
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

  if (input?.price || input.metadata?.apps?.stripe?.price) {
    data.price = input.price || input.metadata?.apps?.stripe?.price;
    const paymentCredential = await prisma.credential.findFirst({
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

  const connectedLink = await prisma.hashedLink.findFirst({
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
      await prisma.hashedLink.upsert({
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
      await prisma.hashedLink.delete({
        where: {
          eventTypeId: input.id,
        },
      });
    }
  }

  const eventType = await prisma.eventType.update({
    where: { id },
    data,
  });
  const res = ctx.res as NextApiResponse;

  if (typeof res?.revalidate !== "undefined") {
    await res?.revalidate(`/${ctx.user.username}/${eventType.slug}`);
  }

  return { eventType };
};
