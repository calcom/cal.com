import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import { buildDateRanges } from "@calcom/features/schedules/lib/date-ranges";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TListTeamAvailaiblityScheme } from "./listTeamAvailability.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListTeamAvailaiblityScheme;
};

async function getTeamMembers({
  teamId,
  organizationId,
  teamIds,
  cursor,
  limit,
  searchString,
}: {
  teamId?: number;
  organizationId: number | null;
  teamIds?: number[];
  cursor: number | null | undefined;
  limit: number;
  searchString?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: {
        in: teamId ? [teamId] : teamIds,
      },
      ...(searchString
        ? {
            OR: [
              { user: { username: { contains: searchString } } },
              { user: { name: { contains: searchString } } },
              { user: { email: { contains: searchString } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          avatarUrl: true,
          id: true,
          username: true,
          name: true,
          email: true,
          travelSchedules: true,
          timeZone: true,
          defaultScheduleId: true,
        },
      },
    },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit + 1, // We take +1 as itll be used for the next cursor
    orderBy: [{ userId: "asc" }, { id: "asc" }], // Prisma require a unique field for tie breaking duplicate value for pagination
    distinct: ["userId"],
  });

  const userRepo = new UserRepository(prisma);
  const users = memberships.map((membership) => membership.user);
  const enrichedUsers = await userRepo.enrichUsersWithTheirProfileExcludingOrgMetadata(users);
  const enrichedUserMap = new Map<number, (typeof enrichedUsers)[0]>();
  enrichedUsers.forEach((enrichedUser) => {
    enrichedUserMap.set(enrichedUser.id, enrichedUser);
  });
  const membershipWithUserProfile = [];
  for (const membership of memberships) {
    const enrichedUser = enrichedUserMap.get(membership.user.id);
    if (!enrichedUser) continue;
    membershipWithUserProfile.push({
      ...membership,
      user: enrichedUser,
    });
  }

  return membershipWithUserProfile;
}

type Member = Awaited<ReturnType<typeof getTeamMembers>>[number];

async function buildMember(member: Member, dateFrom: Dayjs, dateTo: Dayjs) {
  if (!member.user.defaultScheduleId) {
    return {
      id: member.user.id,
      organizationId: member.user.profile?.organizationId ?? null,
      name: member.user.name,
      username: member.user.username,
      email: member.user.email,
      timeZone: member.user.timeZone,
      role: member.role,
      defaultScheduleId: -1,
      dateRanges: [] as DateRange[],
    };
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: member.user.defaultScheduleId },
    select: { availability: true, timeZone: true },
  });
  const timeZone = schedule?.timeZone || member.user.timeZone;

  const { dateRanges } = buildDateRanges({
    dateFrom,
    dateTo,
    timeZone,
    availability: schedule?.availability ?? [],
    travelSchedules: member.user.travelSchedules.map((schedule) => {
      return {
        startDate: dayjs(schedule.startDate),
        endDate: schedule.endDate ? dayjs(schedule.endDate) : undefined,
        timeZone: schedule.timeZone,
      };
    }),
  });

  return {
    id: member.user.id,
    username: member.user.username,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    profile: member.user.profile,
    organizationId: member.user.profile?.organizationId,
    name: member.user.name,
    timeZone,
    role: member.role,
    defaultScheduleId: member.user.defaultScheduleId ?? -1,
    dateRanges,
  };
}

async function getInfoForAllTeams({ ctx, input }: GetOptions) {
  const { cursor, limit, searchString } = input;

  // Get all teamIds for the user
  const teamIds = await prisma.membership
    .findMany({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
        teamId: true,
      },
    })
    .then((memberships) => memberships.map((membership) => membership.teamId));

  if (!teamIds.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User is not part of any organization or team." });
  }

  const teamMembers = await getTeamMembers({
    teamIds,
    organizationId: ctx.user.organizationId,
    cursor,
    limit,
    searchString,
  });

  // Get total team count across all teams the user is in (for pagination)

  const totalTeamMembers = await prisma.$queryRaw<
    {
      count: number;
    }[]
  >`SELECT COUNT(DISTINCT "userId")::integer from "Membership" WHERE "teamId" IN (${Prisma.join(teamIds)})`;

  return {
    teamMembers,
    totalTeamMembers: totalTeamMembers[0].count,
  };
}

export const listTeamAvailabilityHandler = async ({ ctx, input }: GetOptions) => {
  const { cursor, limit, searchString } = input;
  const teamId = input.teamId || ctx.user.organizationId;

  let teamMembers: Member[] = [];
  let totalTeamMembers = 0;

  if (!teamId) {
    // Get all users TODO:
    const teamAllInfo = await getInfoForAllTeams({ ctx, input });

    teamMembers = teamAllInfo.teamMembers;
    totalTeamMembers = teamAllInfo.totalTeamMembers;
  } else {
    const isMember = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: ctx.user.id,
          teamId,
        },
      },
    });

    if (!isMember) {
      teamMembers = [];
      totalTeamMembers = 0;
    } else {
      const { cursor, limit } = input;

      totalTeamMembers = await prisma.membership.count({
        where: {
          teamId: teamId,
          ...(searchString
            ? {
                OR: [
                  { user: { username: { contains: searchString } } },
                  { user: { name: { contains: searchString } } },
                  { user: { email: { contains: searchString } } },
                ],
              }
            : {}),
        },
      });

      // I couldnt get this query to work direct on membership table
      teamMembers = await getTeamMembers({
        teamId,
        cursor,
        limit,
        organizationId: ctx.user.organizationId,
        searchString,
      });
    }
  }

  let nextCursor: typeof cursor | undefined = undefined;
  if (teamMembers && teamMembers.length > limit) {
    const nextItem = teamMembers.pop();
    nextCursor = nextItem?.id;
  }

  const dateFrom = dayjs(input.startDate).tz(input.loggedInUsersTz).subtract(1, "day");
  const dateTo = dayjs(input.endDate).tz(input.loggedInUsersTz).add(1, "day");

  const buildMembers = teamMembers?.map((member) => buildMember(member, dateFrom, dateTo));

  const members = await Promise.all(buildMembers);

  let belongsToTeam = true;

  if (totalTeamMembers === 0) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: ctx.user.id,
      },
      select: {
        id: true,
      },
    });
    belongsToTeam = !!membership;
  }

  return {
    rows: members || [],
    nextCursor,
    meta: {
      totalRowCount: totalTeamMembers,
      isApartOfAnyTeam: belongsToTeam,
    },
  };
};
