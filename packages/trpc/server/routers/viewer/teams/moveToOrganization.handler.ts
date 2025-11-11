import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TMoveToOrganizationSchema } from "./moveToOrganization.schema";

type MoveToOrganizationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TMoveToOrganizationSchema;
};

export const moveToOrganizationHandler = async ({ ctx, input }: MoveToOrganizationOptions) => {
  const { teamId, newSlug } = input;
  const userId = ctx.user.id;

  const orgId = ctx.user.organizationId || ctx.user.organization?.id;

  if (!orgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must be part of an organization to move teams",
    });
  }

  const orgMembership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId: orgId,
      accepted: true,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!orgMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin or owner of the organization to move teams",
    });
  }

  const teamMembership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
      accepted: true,
      role: {
        in: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!teamMembership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin or owner of the team to move it",
    });
  }

  const teamRepo = new TeamRepository(prisma);
  const team = await teamRepo.findById({ id: teamId });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  if (team.parentId !== null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team is already part of an organization",
    });
  }

  if (team.isOrganization) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot move an organization",
    });
  }

  const orgOwnerMembership = await prisma.membership.findFirst({
    where: {
      teamId: orgId,
      accepted: true,
      role: MembershipRole.OWNER,
    },
    include: {
      user: true,
    },
  });

  if (!orgOwnerMembership) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Organization owner not found",
    });
  }

  const finalSlug = newSlug ? slugify(newSlug) : team.slug;

  await createTeamsHandler({
    ctx: {
      user: {
        id: orgOwnerMembership.user.id,
        organizationId: orgId,
      },
    },
    input: {
      teamNames: [],
      orgId,
      moveTeams: [
        {
          id: teamId,
          newSlug: finalSlug,
          shouldMove: true,
        },
      ],
      creationSource: CreationSource.WEBAPP,
    },
  });

  return {
    success: true,
    message: "Team successfully moved to organization",
  };
};

export default moveToOrganizationHandler;
