import { prisma } from "@calcom/prisma";

export type CalIdTeamData = Awaited<ReturnType<typeof getCalIdTeamData>>;

export async function getCalIdTeamData(teamSlug: string, _orgSlug: string | null) {
  return await prisma.calIdTeam.findFirst({
    where: {
      slug: teamSlug,
    },
    orderBy: {
      slug: { sort: "asc", nulls: "last" },
    },
    select: {
      id: true,
      isTeamPrivate: true,
      hideTeamBranding: true,
      logoUrl: true,
      name: true,
      slug: true,
      brandColor: true,
      darkBrandColor: true,
      theme: true,
      bio: true,
      hideTeamProfileLink: true,
      hideBookATeamMember: true,
      bannerUrl: true,
      timeZone: true,
      timeFormat: true,
      weekStart: true,
      metadata: true,
      members: {
        select: {
          id: true,
          role: true,
          acceptedInvitation: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}
