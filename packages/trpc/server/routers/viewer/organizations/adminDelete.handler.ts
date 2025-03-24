import { uniqueBy } from "@calcom/lib/array";
import { deleteDomain } from "@calcom/lib/domainManager/organization";
import logger from "@calcom/lib/logger";
import { UserRepository } from "@calcom/lib/server/repository/user";
import { prisma } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminDeleteInput } from "./adminDelete.schema";

const log = logger.getSubLogger({ prefix: ["organizations/adminDelete"] });
type AdminDeleteOption = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminDeleteInput;
};

const findAllUsersThatWouldBeRemovedFromOrg = async ({
  orgId,
  memberships,
}: {
  orgId: number;
  memberships: {
    user: {
      id: number;
      username: string | null;
    };
  }[];
}) => {
  const userMapper = (user: { id: number; username: string | null }) => ({
    id: user.id,
    username: user.username,
  });

  const orgMembers = memberships.map((membership) => membership.user).map(userMapper);

  // There might be certain users who have their membership removed from the Organization but they still have their organizationId set in User table, allowing them to have same username as someone else in global scope. - Possible due to direct DB changes or some bug
  const usersHavingOrganizationId = (
    await UserRepository.findManyByUserOrganizationId({
      organizationId: orgId,
    })
  ).map(userMapper);

  // There might be some users who don't have their organizationId set in User table, don't have memberships but still have Profile in Organization table - Possible due to direct DB changes or some bug
  const usersHavingOrganizationProfile = (
    await UserRepository.findManyByOrganization({
      organizationId: orgId,
    })
  ).map(userMapper);

  const uniqueUsersThatWouldBeRemovedFromOrg = uniqueBy(
    [...usersHavingOrganizationId, ...usersHavingOrganizationProfile, ...orgMembers],
    ["id"]
  );

  return uniqueUsersThatWouldBeRemovedFromOrg;
};

export const adminDeleteHandler = async ({ input }: AdminDeleteOption) => {
  const { orgId, userRenamingAcknowledged } = input;
  const foundOrg = await prisma.team.findUnique({
    where: {
      id: orgId,
      isOrganization: true,
    },
    include: {
      members: {
        select: {
          user: true,
        },
      },
    },
  });

  if (!foundOrg)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not found",
    });

  const allUsersThatWouldBeRemovedFromOrg = await findAllUsersThatWouldBeRemovedFromOrg({
    orgId,
    memberships: foundOrg.members,
  });

  const allTeamsThatWouldBeRemovedFromOrg = await prisma.team.findMany({
    where: {
      parentId: orgId,
    },
  });

  const usersToRenameToAvoidUsernameConflicts = await getUsersToRenameToAvoidUsernameConflicts(
    allUsersThatWouldBeRemovedFromOrg
  );

  if (usersToRenameToAvoidUsernameConflicts.length && !userRenamingAcknowledged) {
    return {
      ok: false,
      requireUserRenamingConfirmation: true,
      message: `Organization ${foundOrg.name} has ${usersToRenameToAvoidUsernameConflicts.length} users with username conflicts. These users will be renamed and these users should be notified about it.`,
      usersToRename: usersToRenameToAvoidUsernameConflicts,
    };
  }

  await deleteAllRedirectsForUsers(allUsersThatWouldBeRemovedFromOrg);
  // We delete all teams redirects too because otherwise if someone takes up a team with same slug, it will redirect to deleted org
  await deleteAllRedirectsForTeams(allTeamsThatWouldBeRemovedFromOrg);
  await suffixUsernamesWithTheirIds(usersToRenameToAvoidUsernameConflicts);

  if (foundOrg.slug) {
    try {
      await deleteDomain(foundOrg.slug);
    } catch (e) {
      log.error(`Failed to delete domain ${foundOrg.slug}. Do a manual deletion if needed`);
    }
  }

  await prisma.team.delete({
    where: {
      id: input.orgId,
    },
  });

  return {
    ok: true,
    requireUserRenamingConfirmation: false,
    usersToRename: [],
    message: `Organization ${foundOrg.name} deleted.`,
  };
};

export default adminDeleteHandler;

async function getUsersToRenameToAvoidUsernameConflicts(users: { username: string | null }[]) {
  const usersHavingUsername = users.filter(
    (user): user is { id: number; username: string } => !!user.username
  );

  // Get all existing users that have the same usernames but different IDs
  const conflictingUsers = await UserRepository.findManyHavingUsernamesButNotHavingUserIds({
    usernameList: usersHavingUsername.map((u) => u.username),
    notUserIdsList: usersHavingUsername.map((u) => u.id),
  });

  // Create a Set of conflicting usernames for O(1) lookup
  const conflictingUsernames = new Set(conflictingUsers.map((u) => u.username));
  const usersToRename = usersHavingUsername.filter((user) => conflictingUsernames.has(user.username));

  return usersToRename;
}

async function suffixUsernamesWithTheirIds(usersToRename: { id: number; username: string | null }[]) {
  if (!usersToRename.length) {
    return [];
  }

  await Promise.all(
    usersToRename.map((user) =>
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          username: `${user.username}-${user.id}`,
        },
      })
    )
  );
}

async function deleteAllRedirectsForUsers(users: { username: string | null }[]) {
  const usersToDeleteRedirectsFor = users.filter(
    (
      user
    ): user is {
      username: string;
    } => !!user.username
  );

  await prisma.tempOrgRedirect.deleteMany({
    where: {
      from: {
        in: usersToDeleteRedirectsFor.map((user) => user.username),
      },
      type: RedirectType.User,
      fromOrgId: 0,
    },
  });
}

async function deleteAllRedirectsForTeams(teams: { slug: string | null }[]) {
  const teamsToDeleteRedirectsFor = teams.filter((team): team is { slug: string } => !!team.slug);

  await prisma.tempOrgRedirect.deleteMany({
    where: {
      from: {
        in: teamsToDeleteRedirectsFor.map((team) => team.slug),
      },
      type: RedirectType.Team,
      fromOrgId: 0,
    },
  });
}
