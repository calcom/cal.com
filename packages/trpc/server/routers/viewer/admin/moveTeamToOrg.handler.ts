import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import { CreationSource } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TMoveTeamToOrg } from "./moveTeamToOrg.schema";

const log = logger.getSubLogger({ prefix: ["moveTeamToOrg"] });

type MoveTeamToOrgOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: typeof import("@calcom/prisma").prisma;
  };
  input: TMoveTeamToOrg;
};

export const moveTeamToOrgHandler = async ({ ctx, input }: MoveTeamToOrgOptions) => {
  const { teamId, targetOrgId, teamSlugInOrganization } = input;

  log.debug(
    "Moving team to org:",
    safeStringify({
      teamId,
      targetOrgId,
      teamSlugInOrganization,
    })
  );

  const organizationRepository = getOrganizationRepository();
  let org;
  try {
    org = await organizationRepository.adminFindById({ id: targetOrgId });
  } catch (error) {
    throw new TRPCError({ code: "NOT_FOUND", message: "organization_not_found" });
  }

  if (!org.members || org.members.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_owner_not_found" });
  }

  const teamRepository = new TeamRepository(ctx.prisma);
  const team = await teamRepository.findById({ id: teamId });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "team_not_found" });
  }

  if (team.parentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "cannot_move_subteam_already_in_org",
    });
  }

  if (team.isOrganization) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "cannot_move_organization_to_organization",
    });
  }

  const orgOwner = org.members[0].user;

  log.info(
    "Admin moving team to organization",
    safeStringify({
      adminUserId: ctx.user.id,
      orgOwnerId: orgOwner.id,
      teamId,
      targetOrgId,
    })
  );

  const oldTeamSlug = team.slug;
  const newTeamSlug = slugify(teamSlugInOrganization);

  await createTeamsHandler({
    ctx: {
      user: {
        id: orgOwner.id,
        organizationId: targetOrgId,
      },
    },
    input: {
      teamNames: [],
      orgId: targetOrgId,
      moveTeams: [
        {
          id: teamId,
          newSlug: newTeamSlug,
          shouldMove: true,
        },
      ],
      creationSource: CreationSource.WEBAPP,
    },
  });

  return {
    message: "team_moved_to_org_success",
    teamId,
    oldTeamSlug,
    newTeamSlug,
    organizationId: targetOrgId,
    organizationSlug: org.slug,
  };
};

export default moveTeamToOrgHandler;
