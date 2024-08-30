import { v4 as uuidv4 } from "uuid";

import dayjs from "@calcom/dayjs";
import { sendBookingRedirectNotification } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TOutOfOfficeDelete, TOutOfOfficeInputSchema } from "./outOfOffice.schema";

type TBookingRedirect = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeInputSchema;
};

export const outOfOfficeCreateOrUpdate = async ({ ctx, input }: TBookingRedirect) => {
  const { startDate, endDate } = input.dateRange;
  if (!startDate || !endDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_and_end_date_required" });
  }

  const inputStartTime = dayjs(startDate).startOf("day");
  const inputEndTime = dayjs(endDate).endOf("day");
  const offset = dayjs(inputStartTime).utcOffset();

  // If start date is after end date throw error
  if (inputStartTime.isAfter(inputEndTime)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_must_be_before_end_date" });
  }

  // If start date is before to today throw error
  // Since this validation is done using server tz, we need to account for the offset
  if (
    inputStartTime.isBefore(
      dayjs()
        .startOf("day")
        .subtract(Math.abs(offset) * 60, "minute")
    )
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "start_date_must_be_in_the_future" });
  }

  let toUserId;

  if (input.toTeamUserId) {
    const user = await prisma.user.findUnique({
      where: {
        id: input.toTeamUserId,
        /** You can only create OOO for members of teams you belong to */
        teams: {
          some: {
            team: {
              members: {
                some: {
                  userId: ctx.user.id,
                  accepted: true,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "user_not_found" });
    }
    toUserId = user?.id;
  }

  // Validate if OOO entry for these dates already exists
  const outOfOfficeEntry = await prisma.outOfOfficeEntry.findFirst({
    where: {
      AND: [
        { userId: ctx.user.id },
        {
          uuid: {
            not: input.uuid ?? "",
          },
        },
        {
          OR: [
            {
              start: {
                lt: inputEndTime.toISOString(), //existing start is less than or equal to input end time
              },
              end: {
                gt: inputStartTime.toISOString(), //existing end is greater than or equal to input start time
              },
            },
            {
              //existing start is within the new input range
              start: {
                gt: inputStartTime.toISOString(),
                lt: inputEndTime.toISOString(),
              },
            },
            {
              //existing end is within the new input range
              end: {
                gt: inputStartTime.toISOString(),
                lt: inputEndTime.toISOString(),
              },
            },
          ],
        },
      ],
    },
  });

  // don't allow overlapping entries
  if (outOfOfficeEntry) {
    throw new TRPCError({ code: "CONFLICT", message: "out_of_office_entry_already_exists" });
  }

  if (!input.reasonId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "reason_id_required" });
  }

  // Prevent infinite redirects but consider time ranges
  const existingOutOfOfficeEntry = await prisma.outOfOfficeEntry.findFirst({
    select: {
      userId: true,
      toUserId: true,
    },
    where: {
      userId: toUserId,
      toUserId: ctx.user.id,
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

  // don't allow infinite redirects
  if (existingOutOfOfficeEntry) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "booking_redirect_infinite_not_allowed" });
  }
  const startDateUtc = dayjs.utc(startDate).add(input.offset, "minute");
  const endDateUtc = dayjs.utc(endDate).add(input.offset, "minute");

  // Get the existing redirected user from existing out of office entry to send that user appropriate email.
  const previousOutOfOfficeEntry = await prisma.outOfOfficeEntry.findUnique({
    where: {
      uuid: input.uuid ?? "",
    },
    select: {
      start: true,
      end: true,
      toUser: {
        select: {
          email: true,
          username: true,
        },
      },
    },
  });

  const createdOrUpdatedOutOfOffice = await prisma.outOfOfficeEntry.upsert({
    where: {
      uuid: input.uuid ?? "",
    },
    create: {
      uuid: uuidv4(),
      start: startDateUtc.startOf("day").toISOString(),
      end: endDateUtc.endOf("day").toISOString(),
      notes: input.notes,
      userId: ctx.user.id,
      reasonId: input.reasonId,
      toUserId: toUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      start: startDateUtc.startOf("day").toISOString(),
      end: endDateUtc.endOf("day").toISOString(),
      notes: input.notes,
      userId: ctx.user.id,
      reasonId: input.reasonId,
      toUserId: toUserId ? toUserId : null,
    },
  });

  if (toUserId) {
    // await send email to notify user
    const userToNotify = await prisma.user.findFirst({
      where: {
        id: toUserId,
      },
      select: {
        email: true,
        username: true,
      },
    });
    const t = await getTranslation(ctx.user.locale ?? "en", "common");
    const formattedStartDate = new Intl.DateTimeFormat("en-US").format(createdOrUpdatedOutOfOffice.start);
    const formattedEndDate = new Intl.DateTimeFormat("en-US").format(createdOrUpdatedOutOfOffice.end);

    const existingFormattedStartDate = previousOutOfOfficeEntry
      ? new Intl.DateTimeFormat("en-US").format(previousOutOfOfficeEntry.start)
      : "";
    const existingFormattedEndDate = previousOutOfOfficeEntry
      ? new Intl.DateTimeFormat("en-US").format(previousOutOfOfficeEntry.end)
      : "";

    const existingRedirectedUser = previousOutOfOfficeEntry?.toUser
      ? previousOutOfOfficeEntry.toUser
      : undefined;

    // Send cancel email to the old redirect user if it is not same as the current redirect user.
    if (existingRedirectedUser && existingRedirectedUser?.email !== userToNotify?.email) {
      await sendBookingRedirectNotification({
        language: t,
        fromEmail: ctx.user.email,
        eventOwner: ctx.user.username || ctx.user.email,
        toEmail: existingRedirectedUser.email,
        toName: existingRedirectedUser.username || "",
        dates: `${existingFormattedStartDate} - ${existingFormattedEndDate}`,
        action: "cancel",
      });
    }

    if (userToNotify?.email) {
      // If new redirect user exists and it is same as the old redirect user, then send update email.
      if (
        existingRedirectedUser &&
        existingRedirectedUser.email === userToNotify.email &&
        (formattedStartDate !== existingFormattedStartDate || formattedEndDate !== existingFormattedEndDate)
      ) {
        await sendBookingRedirectNotification({
          language: t,
          fromEmail: ctx.user.email,
          eventOwner: ctx.user.username || ctx.user.email,
          toEmail: userToNotify.email,
          toName: userToNotify.username || "",
          oldDates: `${existingFormattedStartDate} - ${existingFormattedEndDate}`,
          dates: `${formattedStartDate} - ${formattedEndDate}`,
          action: "update",
        });
        // If new redirect user exists and the previous redirect user didn't existed or the previous redirect user is not same as the new user, then send add email.
      } else if (
        !existingRedirectedUser ||
        (existingRedirectedUser && existingRedirectedUser.email !== userToNotify.email)
      ) {
        await sendBookingRedirectNotification({
          language: t,
          fromEmail: ctx.user.email,
          eventOwner: ctx.user.username || ctx.user.email,
          toEmail: userToNotify.email,
          toName: userToNotify.username || "",
          dates: `${formattedStartDate} - ${formattedEndDate}`,
          action: "add",
        });
      }
    }
  }

  return {};
};

type TBookingRedirectDelete = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TOutOfOfficeDelete;
};

export const outOfOfficeEntryDelete = async ({ ctx, input }: TBookingRedirectDelete) => {
  if (!input.outOfOfficeUid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "out_of_office_id_required" });
  }

  const deletedOutOfOfficeEntry = await prisma.outOfOfficeEntry.delete({
    where: {
      uuid: input.outOfOfficeUid,
      /** Validate outOfOfficeEntry belongs to the user deleting it */
      userId: ctx.user.id,
    },
    select: {
      start: true,
      end: true,
      toUser: {
        select: {
          email: true,
          username: true,
        },
      },
    },
  });

  if (!deletedOutOfOfficeEntry) {
    throw new TRPCError({ code: "NOT_FOUND", message: "booking_redirect_not_found" });
  }

  // Return early if no redirect user is set, and no email needs to be send.
  if (!deletedOutOfOfficeEntry.toUser) {
    return {};
  }

  const t = await getTranslation(ctx.user.locale ?? "en", "common");

  const formattedStartDate = new Intl.DateTimeFormat("en-US").format(deletedOutOfOfficeEntry.start);
  const formattedEndDate = new Intl.DateTimeFormat("en-US").format(deletedOutOfOfficeEntry.end);

  await sendBookingRedirectNotification({
    language: t,
    fromEmail: ctx.user.email,
    eventOwner: ctx.user.username || ctx.user.email,
    toEmail: deletedOutOfOfficeEntry.toUser.email,
    toName: deletedOutOfOfficeEntry.toUser.username || "",
    dates: `${formattedStartDate} - ${formattedEndDate}`,
    action: "cancel",
  });

  return {};
};

export const outOfOfficeEntriesList = async ({ ctx }: { ctx: { user: NonNullable<TrpcSessionUser> } }) => {
  const outOfOfficeEntries = await prisma.outOfOfficeEntry.findMany({
    where: {
      userId: ctx.user.id,
      end: {
        gte: new Date().toISOString(),
      },
    },
    orderBy: {
      start: "asc",
    },
    select: {
      id: true,
      uuid: true,
      start: true,
      end: true,
      toUserId: true,
      toUser: {
        select: {
          username: true,
        },
      },
      reason: {
        select: {
          id: true,
          emoji: true,
          reason: true,
          userId: true,
        },
      },
      notes: true,
    },
  });

  return outOfOfficeEntries;
};
