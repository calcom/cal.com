import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getUserAvatarUrl } from "@calcom/lib/getAvatarUrl";
import type { PrismaClient } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetEventTypeHostsInputSchema } from "./getEventTypeHosts.schema";

type GetEventTypeHostsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetEventTypeHostsInputSchema;
};

export const getEventTypeHostsHandler = async ({ ctx, input }: GetEventTypeHostsOptions) => {
  const { eventTypeId, limit, cursor, searchQuery } = input;
  const { prisma, user } = ctx;

  const eventType = await prisma.eventType.findFirst({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          id: true,
          parentId: true,
        },
      },
    },
  });

  if (!eventType?.teamId) {
    return {
      hosts: [],
      nextCursor: undefined,
      totalCount: 0,
    };
  }

  const userTeamIds = await MembershipRepository.findUserTeamIds({ userId: user.id });
  if (!userTeamIds.includes(eventType.teamId)) {
    return {
      hosts: [],
      nextCursor: undefined,
      totalCount: 0,
    };
  }

  const isOrgEventType = !!eventType.team?.parentId;

  const whereClause = {
    teamId: eventType.teamId,
    ...(isOrgEventType ? {} : { accepted: true }),
    ...(searchQuery
      ? {
          user: {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" as const } },
              { email: { contains: searchQuery, mode: "insensitive" as const } },
              { username: { contains: searchQuery, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const totalCount = await prisma.membership.count({
    where: whereClause,
  });

  const memberships = await prisma.membership.findMany({
    where: whereClause,
    select: {
      id: true,
      role: true,
      accepted: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          avatarUrl: true,
          defaultScheduleId: true,
          eventTypes: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  let nextCursor: number | undefined = undefined;
  if (memberships.length > limit) {
    const nextItem = memberships.pop();
    nextCursor = nextItem?.id;
  }

  const userRepo = new UserRepository(prisma);

  const hosts = await Promise.all(
    memberships.map(async (member) => {
      const userWithProfile = await userRepo.enrichUserWithItsProfile({
        user: member.user,
      });

      return {
        value: `${member.user.id}`,
        label: `${member.user.name || member.user.email || ""}${!member.user.username ? " (pending)" : ""}`,
        avatar: getUserAvatarUrl(userWithProfile),
        email: member.user.email,
        defaultScheduleId: member.user.defaultScheduleId,
        id: member.user.id,
        name: member.user.name,
        username: member.user.username,
        membership: member.role,
        eventTypes: member.user.eventTypes.map((evTy) => evTy.slug),
        profileId: userWithProfile.profile?.id,
      };
    })
  );

  return {
    hosts,
    nextCursor,
    totalCount,
  };
};
