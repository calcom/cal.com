import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/lib/date-ranges";
import { buildDateRanges } from "@calcom/lib/date-ranges";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TListTeamAvailaiblityScheme } from "./listTeamAvailability.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListTeamAvailaiblityScheme;
};

export const listTeamAvailabilityHandler = async ({ ctx, input }: GetOptions) => {
  const organizationId = ctx.user.organizationId;

  if (!organizationId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization." });
  }

  const { cursor, limit } = input;

  const getTotalMembers = await prisma.membership.count({
    where: {
      teamId: organizationId,
    },
  });

  // I couldnt get this query to work direct on membership table
  const teamMembers = await prisma.membership.findMany({
    where: {
      teamId: organizationId,
      accepted: true,
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          timeZone: true,
          defaultScheduleId: true,
        },
      },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: {
      id: "asc",
    },
  });

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers && teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem!.id;
  }

  const dateFrom = dayjs(input.startDate).tz(input.loggedInUsersTz).subtract(1, "day");
  const dateTo = dayjs(input.endDate).tz(input.loggedInUsersTz).add(1, "day");

  const buildMembers = teamMembers?.map(async (member) => {
    if (!member.user.defaultScheduleId) {
      return {
        id: member.user.id,
        username: member.user.username,
        email: member.user.email,
        timeZone: member.user.timeZone,
        role: member.role,
        dateRanges: [] as DateRange[],
      };
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: member.user.defaultScheduleId },
      select: { availability: true, timeZone: true },
    });
    const timeZone = schedule?.timeZone || member.user.timeZone;

    const dateRanges = buildDateRanges({
      dateFrom,
      dateTo,
      timeZone,
      availability: schedule?.availability ?? [],
    });

    return {
      id: member.user.id,
      username: member.user.username,
      email: member.user.email,
      timeZone,
      role: member.role,
      dateRanges,
    };
  });

  const members = await Promise.all(buildMembers);

  return {
    rows: members || [],
    nextCursor,
    meta: {
      totalRowCount: getTotalMembers || 0,
    },
  };
};
