import { CAL_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getByViewerHandler = async ({ ctx }: GetByViewerOptions) => {
  const user = await prisma.user.findUnique({
    where: {
      id: ctx.user.id,
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      name: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
      workflows: {
        select: {
          id: true,
          name: true,
        },
      },
      teams: {
        where: {
          accepted: true,
        },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              members: {
                select: {
                  userId: true,
                },
              },
              workflows: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }

  const userWorkflows = user.workflows;

  type WorkflowGroup = {
    teamId?: number | null;
    profile: {
      slug: (typeof user)["username"];
      name: (typeof user)["name"];
      image?: string;
    };
    metadata?: {
      readOnly: boolean;
    };
    workflows: typeof userWorkflows;
  };

  let workflowGroups: WorkflowGroup[] = [];

  workflowGroups.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image: user.avatar || undefined,
    },
    workflows: userWorkflows,
    metadata: {
      readOnly: false,
    },
  });

  workflowGroups = ([] as WorkflowGroup[]).concat(
    workflowGroups,
    user.teams.map((membership) => ({
      teamId: membership.team.id,
      profile: {
        name: membership.team.name,
        slug: "team/" + membership.team.slug,
        image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
      },
      metadata: {
        readOnly: membership.role === MembershipRole.MEMBER,
      },
      workflows: membership.team.workflows,
    }))
  );

  return {
    workflowGroups: workflowGroups.filter((groupBy) => !!groupBy.workflows?.length),
    profiles: workflowGroups.map((group) => ({
      teamId: group.teamId,
      ...group.profile,
      ...group.metadata,
    })),
  };
};
