import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TGetPublicCalidTeamInputSchema } from "./calidTeam.schema";

type GetPublicCalidTeamOptions = {
  input: TGetPublicCalidTeamInputSchema;
};

export const getPublicCalidTeamHandler = async ({ input }: GetPublicCalidTeamOptions) => {
  const { teamSlug } = input;

  const calIdTeam = await prisma.calIdTeam.findFirst({
    where: {
      slug: teamSlug,
    },
    include: {
      members: {
        where: {
          accepted: true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatarUrl: true,
              bio: true,
              weekStart: true,
              timeZone: true,
              brandColor: true,
              darkBrandColor: true,
              theme: true,
              metadata: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  bannerUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!calIdTeam) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  return {
    ...calIdTeam,
    members: calIdTeam.members.map((member) => ({
      id: member.id,
      role: member.role,
      accepted: member.accepted,
      user: member.user,
    })),
  };
};

export default getPublicCalidTeamHandler;
