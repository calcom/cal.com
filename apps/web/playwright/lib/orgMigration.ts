import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { RedirectType } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

const log = logger.getSubLogger({ prefix: ["orgMigration"] });

type UserMetadata = {
  migratedToOrgFrom?: {
    username: string;
    reverted: boolean;
    revertTime: string;
    lastMigrationTime: string;
  };
};

/**
 * Make sure that the migration is idempotent
 */
export async function moveUserToOrg({
  user: { id: userId, userName: userName },
  targetOrg: {
    id: targetOrgId,
    username: targetOrgUsername,
    membership: { role: targetOrgRole, accepted: targetOrgMembershipAccepted = true },
  },
  shouldMoveTeams,
}: {
  user: { id?: number; userName?: string };
  targetOrg: {
    id: number;
    username?: string;
    membership: { role: MembershipRole; accepted?: boolean };
  };
  shouldMoveTeams: boolean;
}) {
  assertUserIdOrUserName(userId, userName);
  const team = await getTeamOrThrowError(targetOrgId);

  const teamMetadata = teamMetadataSchema.parse(team?.metadata);

  if (!team.isOrganization) {
    throw new Error(`Team with ID:${targetOrgId} is not an Org`);
  }

  const targetOrganization = {
    ...team,
    metadata: teamMetadata,
  };
  const userToMoveToOrg = await getUniqueUserThatDoesntBelongToOrg(userName, userId, targetOrgId);
  assertUserPartOfOtherOrg(userToMoveToOrg, userName, userId, targetOrgId);

  if (!targetOrgUsername) {
    targetOrgUsername = getOrgUsernameFromEmail(
      userToMoveToOrg.email,
      targetOrganization.organizationSettings?.orgAutoAcceptEmail || ""
    );
  }

  const userWithSameUsernameInOrg = await prisma.user.findFirst({
    where: {
      username: targetOrgUsername,
      organizationId: targetOrgId,
    },
  });

  log.debug({
    userWithSameUsernameInOrg,
    targetOrgUsername,
    targetOrgId,
    userId,
  });

  if (userWithSameUsernameInOrg && userWithSameUsernameInOrg.id !== userId) {
    throw new HttpError({
      statusCode: 400,
      message: `Username ${targetOrgUsername} already exists for orgId: ${targetOrgId} for some other user`,
    });
  }

  assertUserPartOfOrgAndRemigrationAllowed(userToMoveToOrg, targetOrgId, targetOrgUsername, userId);

  const orgMetadata = teamMetadata;

  const userToMoveToOrgMetadata = (userToMoveToOrg.metadata || {}) as UserMetadata;

  const nonOrgUserName =
    (userToMoveToOrgMetadata.migratedToOrgFrom?.username as string) || userToMoveToOrg.username;
  if (!nonOrgUserName) {
    throw new HttpError({
      statusCode: 400,
      message: `User with id: ${userId} doesn't have a non-org username`,
    });
  }

  await dbMoveUserToOrg({ userToMoveToOrg, targetOrgId, targetOrgUsername, nonOrgUserName });

  let teamsToBeMovedToOrg;
  if (shouldMoveTeams) {
    teamsToBeMovedToOrg = await moveTeamsWithoutMembersToOrg({ targetOrgId, userToMoveToOrg });
  }

  await updateMembership({ targetOrgId, userToMoveToOrg, targetOrgRole, targetOrgMembershipAccepted });

  await addRedirect({
    nonOrgUserName,
    teamsToBeMovedToOrg: teamsToBeMovedToOrg || [],
    organization: targetOrganization,
    targetOrgUsername,
  });

  await setOrgSlugIfNotSet(targetOrganization, orgMetadata, targetOrgId);

  log.debug(`orgId:${targetOrgId} attached to userId:${userId}`);
}

/**
 * Make sure that the migration is idempotent
 */
export async function removeUserFromOrg({ targetOrgId, userId }: { targetOrgId: number; userId: number }) {
  const userToRemoveFromOrg = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!userToRemoveFromOrg) {
    throw new HttpError({
      statusCode: 400,
      message: `User with id: ${userId} not found`,
    });
  }

  if (userToRemoveFromOrg.organizationId !== targetOrgId) {
    throw new HttpError({
      statusCode: 400,
      message: `User with id: ${userId} is not part of orgId: ${targetOrgId}`,
    });
  }

  const userToRemoveFromOrgMetadata = (userToRemoveFromOrg.metadata || {}) as {
    migratedToOrgFrom?: {
      username: string;
      reverted: boolean;
      revertTime: string;
      lastMigrationTime: string;
    };
  };

  if (!userToRemoveFromOrgMetadata.migratedToOrgFrom) {
    throw new HttpError({
      statusCode: 400,
      message: `User with id: ${userId} wasn't migrated. So, there is nothing to revert`,
    });
  }

  const nonOrgUserName = userToRemoveFromOrgMetadata.migratedToOrgFrom.username as string;
  if (!nonOrgUserName) {
    throw new HttpError({
      statusCode: 500,
      message: `User with id: ${userId} doesn't have a non-org username`,
    });
  }

  const teamsToBeRemovedFromOrg = await removeTeamsWithoutItsMemberFromOrg({ userToRemoveFromOrg });
  await dbRemoveUserFromOrg({ userToRemoveFromOrg, nonOrgUserName });

  await removeUserAlongWithItsTeamsRedirects({ nonOrgUserName, teamsToBeRemovedFromOrg });
  await removeMembership({ targetOrgId, userToRemoveFromOrg });

  log.debug(`orgId:${targetOrgId} attached to userId:${userId}`);
}

async function getUniqueUserThatDoesntBelongToOrg(
  userName: string | undefined,
  userId: number | undefined,
  excludeOrgId: number
) {
  log.debug("getUniqueUserThatDoesntBelongToOrg", { userName, userId, excludeOrgId });
  if (userName) {
    const matchingUsers = await prisma.user.findMany({
      where: {
        username: userName,
      },
    });
    const foundUsers = matchingUsers.filter(
      (user) => user.organizationId === excludeOrgId || user.organizationId === null
    );
    if (foundUsers.length > 1) {
      throw new Error(`More than one user found with username: ${userName}`);
    }
    return foundUsers[0];
  } else {
    return await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }
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

function assertUserPartOfOrgAndRemigrationAllowed(
  userToMoveToOrg: {
    organizationId: number | null;
  },
  targetOrgId: number,
  targetOrgUsername: string,
  userId: number | undefined
) {
  if (userToMoveToOrg.organizationId) {
    if (userToMoveToOrg.organizationId !== targetOrgId) {
      throw new HttpError({
        statusCode: 400,
        message: `User ${targetOrgUsername} already exists for different Org with orgId: ${targetOrgId}`,
      });
    } else {
      log.debug(`Redoing migration for userId: ${userId} to orgId:${targetOrgId}`);
    }
  }
}

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

function assertUserPartOfOtherOrg(
  userToMoveToOrg: {
    organizationId: number | null;
  } | null,
  userName: string | undefined,
  userId: number | undefined,
  targetOrgId: number
): asserts userToMoveToOrg {
  if (!userToMoveToOrg) {
    throw new HttpError({
      message: `User ${userName ? userName : `ID:${userId}`} is part of an org already`,
      statusCode: 400,
    });
  }

  if (userToMoveToOrg.organizationId && userToMoveToOrg.organizationId !== targetOrgId) {
    throw new HttpError({
      message: `User is already a part of different organization ID: ${userToMoveToOrg.organizationId}`,
      statusCode: 400,
    });
  }
}

function assertUserIdOrUserName(userId: number | undefined, userName: string | undefined) {
  if (!userId && !userName) {
    throw new HttpError({ statusCode: 400, message: "userId or userName is required" });
  }
  if (userId && userName) {
    throw new HttpError({ statusCode: 400, message: "Provide either userId or userName" });
  }
}

async function addRedirect({
  nonOrgUserName,
  organization,
  targetOrgUsername,
  teamsToBeMovedToOrg,
}: {
  nonOrgUserName: string | null;
  organization: Team;
  targetOrgUsername: string;
  teamsToBeMovedToOrg: { slug: string | null }[];
}) {
  if (!nonOrgUserName) {
    return;
  }
  const orgSlug = organization.slug || (organization.metadata as { requestedSlug?: string })?.requestedSlug;
  if (!orgSlug) {
    log.debug("No slug for org. Not adding the redirect", safeStringify({ organization, nonOrgUserName }));
    return;
  }
  // If the user had a username earlier, we need to redirect it to the new org username
  const orgUrlPrefix = getOrgFullOrigin(orgSlug);
  log.debug({
    orgUrlPrefix,
    nonOrgUserName,
    targetOrgUsername,
  });

  await prisma.tempOrgRedirect.upsert({
    where: {
      from_type_fromOrgId: {
        type: RedirectType.User,
        from: nonOrgUserName,
        fromOrgId: 0,
      },
    },
    create: {
      type: RedirectType.User,
      from: nonOrgUserName,
      fromOrgId: 0,
      toUrl: `${orgUrlPrefix}/${targetOrgUsername}`,
    },
    update: {
      toUrl: `${orgUrlPrefix}/${targetOrgUsername}`,
    },
  });

  for (const [, team] of Object.entries(teamsToBeMovedToOrg)) {
    if (!team.slug) {
      log.debug("No slug for team. Not adding the redirect", safeStringify({ team }));
      continue;
    }
    await prisma.tempOrgRedirect.upsert({
      where: {
        from_type_fromOrgId: {
          type: RedirectType.Team,
          from: team.slug,
          fromOrgId: 0,
        },
      },
      create: {
        type: RedirectType.Team,
        from: team.slug,
        fromOrgId: 0,
        toUrl: `${orgUrlPrefix}/team/${team.slug}`,
      },
      update: {
        toUrl: `${orgUrlPrefix}/team/${team.slug}`,
      },
    });
  }
}

async function updateMembership({
  targetOrgId,
  userToMoveToOrg,
  targetOrgRole,
  targetOrgMembershipAccepted,
}: {
  targetOrgId: number;
  userToMoveToOrg: User;
  targetOrgRole: MembershipRole;
  targetOrgMembershipAccepted: boolean;
}) {
  log.debug("updateMembership", { targetOrgId, userToMoveToOrg, targetOrgRole, targetOrgMembershipAccepted });
  await prisma.membership.upsert({
    where: {
      userId_teamId: {
        teamId: targetOrgId,
        userId: userToMoveToOrg.id,
      },
    },
    create: {
      teamId: targetOrgId,
      userId: userToMoveToOrg.id,
      role: targetOrgRole,
      accepted: targetOrgMembershipAccepted,
    },
    update: {
      role: targetOrgRole,
      accepted: targetOrgMembershipAccepted,
    },
  });
}

async function dbMoveUserToOrg({
  userToMoveToOrg,
  targetOrgId,
  targetOrgUsername,
  nonOrgUserName,
}: {
  userToMoveToOrg: User;
  targetOrgId: number;
  targetOrgUsername: string;
  nonOrgUserName: string | null;
}) {
  await prisma.user.update({
    where: {
      id: userToMoveToOrg.id,
    },
    data: {
      organizationId: targetOrgId,
      username: targetOrgUsername,
      metadata: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ...(userToMoveToOrg.metadata || {}),
        migratedToOrgFrom: {
          username: nonOrgUserName,
          lastMigrationTime: new Date().toISOString(),
        },
      },
    },
  });

  await prisma.profile.upsert({
    create: {
      uid: ProfileRepository.generateProfileUid(),
      userId: userToMoveToOrg.id,
      organizationId: targetOrgId,
      username: targetOrgUsername,
      movedFromUser: {
        connect: {
          id: userToMoveToOrg.id,
        },
      },
    },
    update: {
      organizationId: targetOrgId,
      username: targetOrgUsername,
      movedFromUser: {
        connect: {
          id: userToMoveToOrg.id,
        },
      },
    },
    where: {
      userId_organizationId: {
        userId: userToMoveToOrg.id,
        organizationId: targetOrgId,
      },
    },
  });
}

async function moveTeamsWithoutMembersToOrg({
  targetOrgId,
  userToMoveToOrg,
}: {
  targetOrgId: number;
  userToMoveToOrg: User;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: userToMoveToOrg.id,
    },
  });

  const membershipTeamIds = memberships.map((m) => m.teamId);
  const teams = await prisma.team.findMany({
    where: {
      id: {
        in: membershipTeamIds,
      },
    },
    select: {
      id: true,
      slug: true,
      metadata: true,
      isOrganization: true,
    },
  });

  const teamsToBeMovedToOrg = teams
    .map((team) => {
      return {
        ...team,
        metadata: teamMetadataSchema.parse(team.metadata),
      };
    })
    // Remove Orgs from the list
    .filter((team) => !team.isOrganization);

  const teamIdsToBeMovedToOrg = teamsToBeMovedToOrg.map((t) => t.id);

  if (memberships.length) {
    // Add the user's teams to the org
    await prisma.team.updateMany({
      where: {
        id: {
          in: teamIdsToBeMovedToOrg,
        },
      },
      data: {
        parentId: targetOrgId,
      },
    });
  }
  return teamsToBeMovedToOrg;
}

/**
 * Make sure you pass it an organization ID only and not a team ID.
 */
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

async function removeUserAlongWithItsTeamsRedirects({
  nonOrgUserName,
  teamsToBeRemovedFromOrg,
}: {
  nonOrgUserName: string | null;
  teamsToBeRemovedFromOrg: { slug: string | null }[];
}) {
  if (!nonOrgUserName) {
    return;
  }

  await prisma.tempOrgRedirect.deleteMany({
    // This where clause is unique, so we will get only one result but using deleteMany because it doesn't throw an error if there are no rows to delete
    where: {
      type: RedirectType.User,
      from: nonOrgUserName,
      fromOrgId: 0,
    },
  });

  for (const [, team] of Object.entries(teamsToBeRemovedFromOrg)) {
    if (!team.slug) {
      log.debug("No slug for team. Not removing the redirect", safeStringify({ team }));
      continue;
    }
    await prisma.tempOrgRedirect.deleteMany({
      where: {
        type: RedirectType.Team,
        from: team.slug,
        fromOrgId: 0,
      },
    });
  }
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

  const teamMetadata = teamMetadataSchema.parse(team?.metadata);
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
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new HttpError({
          message: `Looks like the team's name is already taken by some other team outside the org or an org itself. Please change this team's name or the other team/org's name. If you rename the team that you are trying to remove from the org, you will have to manually remove the redirect from the database for that team as the slug would have changed.`,
          statusCode: 400,
        });
      }
    }
    throw e;
  }
}

async function removeTeamsWithoutItsMemberFromOrg({ userToRemoveFromOrg }: { userToRemoveFromOrg: User }) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId: userToRemoveFromOrg.id,
    },
  });

  const membershipTeamIds = memberships.map((m) => m.teamId);
  const teams = await prisma.team.findMany({
    where: {
      id: {
        in: membershipTeamIds,
      },
    },
    select: {
      id: true,
      slug: true,
      metadata: true,
      isOrganization: true,
    },
  });

  const teamsToBeRemovedFromOrg = teams
    .map((team) => {
      return {
        ...team,
        metadata: teamMetadataSchema.parse(team.metadata),
      };
    })
    // Remove Orgs from the list
    .filter((team) => !team.isOrganization);

  const teamIdsToBeRemovedFromOrg = teamsToBeRemovedFromOrg.map((t) => t.id);

  if (memberships.length) {
    // Remove the user's teams from the org
    await prisma.team.updateMany({
      where: {
        id: {
          in: teamIdsToBeRemovedFromOrg,
        },
      },
      data: {
        parentId: null,
      },
    });
  }
  return teamsToBeRemovedFromOrg;
}

async function dbRemoveUserFromOrg({
  userToRemoveFromOrg,
  nonOrgUserName,
}: {
  userToRemoveFromOrg: User;
  nonOrgUserName: string;
}) {
  await prisma.user.update({
    where: {
      id: userToRemoveFromOrg.id,
    },
    data: {
      organizationId: null,
      username: nonOrgUserName,
      metadata: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ...(userToRemoveFromOrg.metadata || {}),
        migratedToOrgFrom: {
          username: null,
          reverted: true,
          revertTime: new Date().toISOString(),
        },
      },
    },
  });

  await ProfileRepository.deleteMany({
    userIds: [userToRemoveFromOrg.id],
  });
}

async function removeMembership({
  targetOrgId,
  userToRemoveFromOrg,
}: {
  targetOrgId: number;
  userToRemoveFromOrg: User;
}) {
  await prisma.membership.deleteMany({
    where: {
      teamId: targetOrgId,
      userId: userToRemoveFromOrg.id,
    },
  });
}
