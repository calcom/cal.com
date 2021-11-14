import { Prisma } from "@prisma/client";

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

  const where = id ? { id } : { slug };

  const team = await prisma.team.findUnique({
    where,
    select: teamSelect,
  });

  return team;
}
