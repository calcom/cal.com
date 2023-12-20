import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { sendAcceptBookingForwarding } from "@calcom/emails";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TBookingForwardingConfirm, TBookingForwardingInputSchema } from "./bookingForwarding.schema";

type BookingForwardingT = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBookingForwardingInputSchema;
};

export const bookingForwardingCreate = async ({ ctx, input }: BookingForwardingT) => {
  if (!input.startDate || !input.endDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_and_end_date_required" });
  }
  const inputStartTime = dayjs(input.startDate).startOf("day");
  const inputEndTime = dayjs(input.endDate).endOf("day");

  // If start date is after end date throw error
  if (inputStartTime.isAfter(inputEndTime)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_must_be_before_end_date" });
  }

  // If start and end date are in the future throw error
  if (inputStartTime.isAfter(dayjs().endOf("day"))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_must_be_in_the_future" });
  }

  let toUserId;

  if (input.toTeamUserId) {
    const user = await prisma.user.findUnique({
      where: {
        id: input.toTeamUserId,
      },
      select: {
        id: true,
      },
    });
    toUserId = user?.id;
  }
  if (!toUserId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "user_not_found" });
  }

  // Validate if already exists
  const bookingForwarding = await prisma.bookingForwarding.findFirst({
    where: {
      start: inputStartTime.toISOString(),
      end: inputEndTime.toISOString(),
      userId: ctx.user.id,
      toUserId: toUserId,
    },
  });

  if (bookingForwarding) {
    throw new TRPCError({ code: "CONFLICT", message: "booking_forwarding_already_exists" });
  }

  // Prevent infinite redirects but consider time ranges
  const existingBookingForwarding = await prisma.bookingForwarding.findFirst({
    select: {
      userId: true,
      toUserId: true,
      status: true,
    },
    where: {
      userId: toUserId,
      toUserId: ctx.user.id,
      // any status since it can be accepted in the future
      // Check for time overlap or collision
      OR: [
        // Outside of range
        {
          AND: [
            { start: { lte: inputEndTime.toISOString() } },
            { end: { gte: inputStartTime.toISOString() } },
          ],
        },
        // Inside of range
        {
          AND: [
            { start: { gte: inputStartTime.toISOString() } },
            { end: { lte: inputEndTime.toISOString() } },
          ],
        },
      ],
    },
  });

  if (existingBookingForwarding) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "booking_forwarding_infinite_not_allowed" });
  }

  // Count number of booking redirects with accepted status and start date in the future
  const acceptedBookingForwardings = await prisma.bookingForwarding.count({
    where: {
      userId: ctx.user.id,
      start: {
        gte: new Date().toISOString(),
      },
    },
  });

  // Limit to 10 always
  if (acceptedBookingForwardings >= 10) {
    throw new TRPCError({ code: "CONFLICT", message: "booking_redirect_limit_reached" });
  }

  const createdForwarding = await prisma.bookingForwarding.create({
    data: {
      uuid: uuidv4(),
      start: dayjs(input.startDate).startOf("day").toISOString(),
      end: dayjs(input.endDate).endOf("day").toISOString(),
      userId: ctx.user.id,
      toUserId: toUserId,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // await send email to notify user
  const userToNotify = await prisma.user.findFirst({
    where: {
      id: toUserId,
    },
    select: {
      email: true,
    },
  });
  const t = await getTranslation(ctx.user.locale ?? "en", "common");
  const formattedStartDate = new Intl.DateTimeFormat("en-US").format(createdForwarding.start);
  const formattedEndDate = new Intl.DateTimeFormat("en-US").format(createdForwarding.end);
  if (userToNotify?.email) {
    await sendAcceptBookingForwarding({
      language: t,
      fromEmail: ctx.user.email,
      toEmail: userToNotify.email,
      toName: ctx.user.username || "",
      acceptLink: `${WEBAPP_URL}/booking-forwarding/accept/${createdForwarding?.uuid}`,
      rejectLink: `${WEBAPP_URL}/booking-forwarding/reject/${createdForwarding?.uuid}`,
      dates: `${formattedStartDate} - ${formattedEndDate}`,
    });
  }
  return {};
};

type BookingForwardingConfirmT = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBookingForwardingConfirm;
};

export const bookingForwardingAccept = async ({ ctx, input }: BookingForwardingConfirmT) => {
  if (!input.bookingForwardingUid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "booking_redirect_id_required" });
  }

  // Validate bookingForwarding is targeted to the user accepting it
  const bookingForwarding = await prisma.bookingForwarding.findFirst({
    where: {
      id: Number(input.bookingForwardingUid),
      toUserId: ctx.user.id,
    },
  });

  if (!bookingForwarding) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_redirect_not_found" });
  }

  await prisma.bookingForwarding.update({
    where: {
      id: Number(input.bookingForwardingUid),
    },
    data: {
      status: "PENDING",
      updatedAt: new Date(),
    },
  });

  return {};
};

type BookingForwardingDeleteT = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBookingForwardingConfirm;
};

export const bookingForwardingDelete = async ({ ctx, input }: BookingForwardingDeleteT) => {
  if (!input.bookingForwardingUid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "booking_redirect_id_required" });
  }

  // Validate bookingForwarding belongs to the user deleting it
  const bookingForwarding = await prisma.bookingForwarding.findFirst({
    select: {
      uuid: true,
      userId: true,
    },
    where: {
      uuid: input.bookingForwardingUid,
      userId: ctx.user.id,
    },
  });

  if (!bookingForwarding) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_redirect_not_found" });
  }

  await prisma.bookingForwarding.delete({
    where: {
      uuid: input.bookingForwardingUid,
    },
  });

  return {};
};

export const bookingForwardingList = async ({ ctx }: { ctx: { user: NonNullable<TrpcSessionUser> } }) => {
  const bookingForwardings = await prisma.bookingForwarding.findMany({
    where: {
      userId: ctx.user.id,
      end: {
        gte: new Date().toISOString(),
      },
    },
    orderBy: {
      start: "desc",
    },
    select: {
      id: true,
      uuid: true,
      start: true,
      end: true,
      status: true,
      toUserId: true,
      toUser: {
        select: {
          username: true,
        },
      },
    },
  });

  return bookingForwardings;
};
