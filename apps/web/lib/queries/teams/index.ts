import { Prisma, UserPlan } from "@prisma/client";

import prisma from "@lib/prisma";

type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R>
  ? R
  : any;

export type TeamWithMembers = AsyncReturnType<typeof getTeamWithMembers>;

export async function getTeamWithMembers(id?: number, slug?: string) {
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    avatar: true,
    email: true,
    name: true,
    id: true,
    plan: true,
    bio: true,
  });

  const teamSelect = Prisma.validator<Prisma.TeamSelect>()({
    id: true,
    name: true,
    slug: true,
    logo: true,
    bio: true,
    hideBranding: true,
    members: {
      select: {
        user: {
          select: userSelect,
        },
      },
    },
    eventTypes: {
      where: {
        hidden: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        length: true,
        slug: true,
        schedulingType: true,
        price: true,
        currency: true,
        users: {
          select: userSelect,
        },
      },
    },
  });

  const team = await prisma.team.findUnique({
    where: id ? { id } : { slug },
    select: teamSelect,
  });

  if (!team) return null;

  const memberships = await prisma.membership.findMany({
    where: {
      teamId: team.id,
    },
  });

  const members = team.members.map((obj) => {
    const membership = memberships.find((membership) => obj.user.id === membership.userId);
    return {
      ...obj.user,
      isMissingSeat: obj.user.plan === UserPlan.FREE,
      role: membership?.role,
      accepted: membership?.role === "OWNER" ? true : membership?.accepted,
    };
  });

  return { ...team, members };
}
// also returns team
export async function isTeamAdmin(userId: number, teamId: number) {
  return (
    (await prisma.membership.findFirst({
      where: {
        userId,
        teamId,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    })) || false
  );
}
export async function isTeamOwner(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      role: "OWNER",
    },
  }));
}
