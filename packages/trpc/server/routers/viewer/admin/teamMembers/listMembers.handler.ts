import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TListMembersInputSchema } from "./listMembers.schema";

type ListMembersOptions = {
  ctx: {
    user: TrpcSessionUser;
  };
  input: TListMembersInputSchema;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersOptions) => {
  const { teamId, limit, offset, searchTerm } = input;

  const whereClause = {
    teamId,
    ...(searchTerm && {
      user: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { email: { contains: searchTerm, mode: "insensitive" as const } },
          { username: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      },
    }),
  };

  const [members, totalCount] = await Promise.all([
    prisma.membership.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatarUrl: true,
            locked: true,
            role: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            isOrganization: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.membership.count({
      where: whereClause,
    }),
  ]);

  return {
    members: members.map((member) => ({
      id: member.id,
      userId: member.user.id,
      teamId: member.teamId,
      role: member.role,
      accepted: member.accepted,
      disableImpersonation: member.disableImpersonation,
      createdAt: member.createdAt,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        username: member.user.username,
        avatarUrl: member.user.avatarUrl,
        locked: member.user.locked,
        role: member.user.role,
      },
      team: member.team,
    })),
    totalCount,
  };
};

export default listMembersHandler;
