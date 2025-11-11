import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";
import { teamMetadataSchema, teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";

import { moveUserToOrg } from "../playwright/lib/orgMigration";

const log = logger.getSubLogger({ prefix: ["orgMigration"] });

async function getTeamOrThrowError(targetOrgId: number) {
  const team = await prisma.team.findUnique({
    where: {
      id: targetOrgId,
    },
    include: {
      organizationSettings: true,
    },
  });

  if (!team) {
    throw new HttpError({
      statusCode: 400,
      message: `Org with id: ${targetOrgId} not found`,
    });
  }
  return team;
}

async function setOrgSlugIfNotSet(
  targetOrganization: {
    slug: string | null;
  },
  orgMetadata: {
    requestedSlug?: string | null | undefined;
  } | null,
  targetOrgId: number
) {
  if (targetOrganization.slug) {
    return;
  }

  if (!orgMetadata?.requestedSlug) {
    throw new HttpError({
      statusCode: 400,
      message: `Org with id: ${targetOrgId} doesn't have a slug. Tried using requestedSlug but that's also not present. So, all migration done but failed to set the Organization slug. Please set it manually`,
    });
  }
  await setOrgSlug({
    targetOrgId,
    targetSlug: orgMetadata.requestedSlug,
  });
}

async function setOrgSlug({ targetOrgId, targetSlug }: { targetOrgId: number; targetSlug: string }) {
  await prisma.team.update({
    where: {
      id: targetOrgId,
    },
    data: {
      slug: targetSlug,
    },
  });
}

/**
 * Move a team to an organization
 * Make sure that the migration is idempotent
 */
export async function moveTeamToOrg({
  targetOrg,
  teamId,
  moveMembers,
}: {
  targetOrg: {
    id: number;
    teamSlug?: string;
  };
  teamId: number;
  moveMembers?: boolean;
}) {
  const targetOrgId = targetOrg.id;
  const teamSlugInOrganization = targetOrg.teamSlug;

  const possibleOrg = await getTeamOrThrowError(targetOrgId);
  const movedTeam = await dbMoveTeamToOrg({ teamId, targetOrgId, teamSlugInOrganization });

  const teamMetadata = teamMetadataSchema.parse(possibleOrg?.metadata);

  if (!possibleOrg.isOrganization) {
    throw new HttpError({
      statusCode: 400,
      message: `Team with ID:${targetOrgId} is not an Org`,
    });
  }

  const targetOrganization = possibleOrg;
  const orgMetadata = teamMetadata;
  await addTeamRedirect(movedTeam.slug, targetOrganization.slug || orgMetadata.requestedSlug || null);
  await setOrgSlugIfNotSet(targetOrganization, orgMetadata, targetOrgId);

  if (moveMembers) {
    for (const membership of movedTeam.members) {
      await moveUserToOrg({
        user: {
          id: membership.userId,
        },
        targetOrg: {
          id: targetOrgId,
          membership: {
            role: membership.role,
            accepted: membership.accepted,
          },
        },
        shouldMoveTeams: false,
      });
    }
  }
  log.debug(`Successfully moved team ${teamId} to org ${targetOrgId}`);
}

/**
 * Remove a team from an organization
 * Make sure that the migration is idempotent
 */
export async function removeTeamFromOrg({ targetOrgId, teamId }: { targetOrgId: number; teamId: number }) {
  const removedTeam = await dbRemoveTeamFromOrg({ teamId });

  await removeTeamRedirect(removedTeam.slug);

  log.debug(`Successfully removed team ${teamId} from org ${targetOrgId}`);
}

async function dbMoveTeamToOrg({
  teamId,
  targetOrgId,
  teamSlugInOrganization,
}: {
  teamId: number;
  targetOrgId: number;
  teamSlugInOrganization?: string;
}) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    include: {
      members: true,
    },
  });

  if (!team) {
    throw new HttpError({
      statusCode: 400,
      message: `Team with id: ${teamId} not found`,
    });
  }

  if (team.parentId === targetOrgId) {
    log.warn(`Team ${teamId} is already in org ${targetOrgId}`);
    return team;
  }

  const teamMetadata = teamMetadataStrictSchema.parse(team?.metadata);

  const updateData: {
    parentId: number;
    slug?: string;
    metadata?: typeof teamMetadata & {
      migratedToOrgFrom?: {
        teamSlug: string | null;
        lastMigrationTime: string;
      };
    };
  } = {
    parentId: targetOrgId,
    metadata: {
      ...teamMetadata,
      migratedToOrgFrom: {
        teamSlug: team.slug,
        lastMigrationTime: new Date().toISOString(),
      },
    },
  };

  if (teamSlugInOrganization) {
    updateData.slug = teamSlugInOrganization;
  }

  await prisma.team.update({
    where: {
      id: teamId,
    },
    data: updateData,
  });

  return team;
}

async function dbRemoveTeamFromOrg({ teamId }: { teamId: number }) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
  });

  if (!team) {
    throw new HttpError({
      statusCode: 400,
      message: `Team with id: ${teamId} not found`,
    });
  }

  const teamMetadata = teamMetadataStrictSchema.parse(team?.metadata);
  try {
    return await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        parentId: null,
        slug: teamMetadata?.migratedToOrgFrom?.teamSlug || team.slug,
        metadata: {
          ...teamMetadata,
          migratedToOrgFrom: {
            reverted: true,
            lastRevertTime: new Date().toISOString(),
          },
        },
      },
      include: {
        members: true,
      },
    });
  } catch (e) {
    if (e instanceof Error && "code" in e && e.code === "P2002") {
      throw new HttpError({
        message: `Looks like the team's name is already taken by some other team outside the org or an org itself. Please change this team's name or the other team/org's name. If you rename the team that you are trying to remove from the org, you will have to manually remove the redirect from the database for that team as the slug would have changed.`,
        statusCode: 400,
      });
    }
    throw e;
  }
}

async function addTeamRedirect(teamSlug: string | null, orgSlug: string | null) {
  if (!teamSlug) {
    throw new HttpError({
      statusCode: 400,
      message: "No slug for team. Not adding the redirect",
    });
  }
  if (!orgSlug) {
    log.warn(`No slug for org. Not adding the redirect`);
    return;
  }
  const orgUrlPrefix = getOrgFullOrigin(orgSlug);

  await prisma.tempOrgRedirect.upsert({
    where: {
      from_type_fromOrgId: {
        type: RedirectType.Team,
        from: teamSlug,
        fromOrgId: 0,
      },
    },
    create: {
      type: RedirectType.Team,
      from: teamSlug,
      fromOrgId: 0,
      toUrl: `${orgUrlPrefix}/${teamSlug}`,
    },
    update: {
      toUrl: `${orgUrlPrefix}/${teamSlug}`,
    },
  });
}

async function removeTeamRedirect(teamSlug: string | null) {
  if (!teamSlug) {
    throw new HttpError({
      statusCode: 400,
      message: "No slug for team. Not removing the redirect",
    });
  }

  await prisma.tempOrgRedirect.deleteMany({
    where: {
      type: RedirectType.Team,
      from: teamSlug,
      fromOrgId: 0,
    },
  });
}
