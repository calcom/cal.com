import { Team } from "@prisma/client";
import prisma from "@lib/prisma";
import { defaultAvatarSrc } from "@lib/profile";

export const getTeam = async (idOrSlug: string): Promise<Team | null> => {
  const teamIdOrSlug = idOrSlug;
  const teamSelectInput = {
    id: true,
    name: true,
    slug: true,
    members: {
      where: {
        accepted: true,
      },
      select: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            bio: true,
            avatar: true,
            theme: true,
          },
        },
      },
    },
  };

  const team = await prisma.team.findFirst({
    where: {
      OR: [
        {
          id: parseInt(teamIdOrSlug) || undefined,
        },
        {
          slug: teamIdOrSlug,
        },
      ],
    },
    select: teamSelectInput,
  });

  team.members = team.members.map((member) => {
    member.user.avatar = member.user.avatar || defaultAvatarSrc({ email: member.user.email });
    return member;
  });

  return team;
};
