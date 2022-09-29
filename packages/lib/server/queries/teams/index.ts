import { Prisma, UserPlan } from "@prisma/client";
import { z } from "zod";

import prisma, { baseEventTypeSelect } from "@calcom/prisma";
import { _EventTypeModel, _TeamModel, _UserModel } from "@calcom/prisma/zod";

export type TeamWithMembers = Awaited<ReturnType<typeof getTeamWithMembers>>;
export async function getTeamWithMembers(id?: number, slug?: string) {
  const userSelect = Prisma.validator<Prisma.UserSelect>()({
    username: true,
    email: true,
    name: true,
    id: true,
    plan: true,
    bio: true,
    avatar: true,
  });
  const zodUserSelect = _UserModel.pick(userSelect);
  const zodEventTypeSelect = _EventTypeModel.pick(baseEventTypeSelect);
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
        users: {
          select: userSelect,
        },
        ...baseEventTypeSelect,
      },
    },
  });

  const zodTeamSelect = _TeamModel.pick(teamSelect).extend({
    members: z.array(
      z.object({
        user: zodUserSelect,
      })
    ),
    eventTypes: z.array(
      zodEventTypeSelect.extend({
        users: zodUserSelect.array(),
      })
    ),
  });

  const team = await prisma.team.findUnique({
    where: id ? { id } : { slug },
    select: teamSelect,
  });

  if (!team) return null;
  const parsedTeam = zodTeamSelect.parse(team);
  const memberships = await prisma.membership.findMany({
    where: {
      teamId: team.id,
    },
  });

  const members = parsedTeam.members.map((obj) => {
    const membership = memberships.find((membership) => obj.user.id === membership.userId);
    return {
      ...obj.user,
      isMissingSeat: obj.user.plan === UserPlan.FREE,
      role: membership?.role,
      accepted: membership?.accepted,
      disableImpersonation: membership?.disableImpersonation,
    };
  });

  return { ...parsedTeam, members };
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

export async function isTeamMember(userId: number, teamId: number) {
  return !!(await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
    },
  }));
}
