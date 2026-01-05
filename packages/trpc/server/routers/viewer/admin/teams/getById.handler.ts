import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetTeamByIdSchema } from "./getById.schema";

type GetByIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamByIdSchema;
};

export const getByIdHandler = async ({ input }: GetByIdOptions) => {
  const { teamId } = input;

  const [team, teamBilling, orgBilling, memberCount, eventTypeCount, workflowCount, routingFormCount] =
    await Promise.all([
      prisma.team.findUnique({
        where: {
          id: teamId,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          organizationSettings: {
            select: {
              isOrganizationConfigured: true,
              isOrganizationVerified: true,
              isAdminReviewed: true,
              isAdminAPIEnabled: true,
              lockEventTypeCreationForUsers: true,
            },
          },
        },
      }),
      prisma.teamBilling.findUnique({
        where: { teamId },
      }),
      prisma.organizationBilling.findUnique({
        where: { teamId },
      }),
      prisma.membership.count({ where: { teamId } }),
      prisma.eventType.count({ where: { teamId } }),
      prisma.workflow.count({ where: { teamId } }),
      prisma.app_RoutingForms_Form.count({ where: { teamId } }),
    ]);

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  // Get billing record based on type
  const billing = team.isOrganization ? orgBilling : teamBilling;

  return {
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug || "",
      bio: team.bio,
      logoUrl: team.logoUrl,
      isOrganization: team.isOrganization,
      isPlatform: team.isPlatform,
      createdAt: team.createdAt,
      hideBranding: team.hideBranding,
      isPrivate: team.isPrivate,
      hideBookATeamMember: team.hideBookATeamMember,
      metadata: team.metadata,
      parentId: team.parentId,
      parent: team.parent
        ? {
            id: team.parent.id,
            name: team.parent.name,
            slug: team.parent.slug || "",
          }
        : null,
      organizationSettings: team.organizationSettings,
    },
    billing: billing || null,
    stats: {
      memberCount,
      eventTypeCount,
      workflowCount,
      routingFormCount,
    },
  };
};

export default getByIdHandler;
