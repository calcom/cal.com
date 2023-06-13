import { CAL_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { compareMembership } from "../eventTypes/getByViewer.handler";

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
              parentId: true,
              metadata: true,
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

  const image = user?.username ? `${CAL_URL}/${user.username}/avatar.png` : undefined;
  workflowGroups.push({
    teamId: null,
    profile: {
      slug: user.username,
      name: user.name,
      image,
    },
    workflows: userWorkflows,
    metadata: {
      readOnly: false,
    },
  });

  const teamMemberships = user.teams.map((membership) => ({
    teamId: membership.team.id,
    membershipRole: membership.role,
  }));

  workflowGroups = ([] as WorkflowGroup[]).concat(
    workflowGroups,
    user.teams
      .filter((mmship) => {
        const metadata = teamMetadataSchema.parse(mmship.team.metadata);
        return !metadata?.isOrganization;
      })
      .map((membership) => {
        const orgMembership = teamMemberships.find(
          (teamM) => teamM.teamId === membership.team.parentId
        )?.membershipRole;
        return {
          teamId: membership.team.id,
          profile: {
            name: membership.team.name,
            slug: membership.team.slug
              ? !membership.team.parentId
                ? `/team`
                : "" + membership.team.slug
              : null,
            image: `${CAL_URL}/team/${membership.team.slug}/avatar.png`,
          },
          metadata: {
            readOnly:
              membership.role ===
              (membership.team.parentId
                ? orgMembership && compareMembership(orgMembership, membership.role)
                  ? orgMembership
                  : MembershipRole.MEMBER
                : MembershipRole.MEMBER),
          },
          workflows: membership.team.workflows,
        };
      })
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
