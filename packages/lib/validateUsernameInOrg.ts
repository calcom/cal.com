import prisma from "@calcom/prisma";

import slugify from "./slugify";

/** Scenarios:
 * 1 org 1 child team:
 * 1 org 2+ child teams:
 * 1 org 1 child team and 1 child team of first child team: Is this supported?
 */

export const validateUsernameInOrg = async (usernameSlug: string, teamId: number): Promise<boolean> => {
  try {
    let takenSlugs = [];
    const teamsFound = await prisma.team.findMany({
      where: {
        OR: [{ id: teamId }, { parentId: teamId }],
      },
      select: {
        slug: true,
        parentId: true,
      },
    });

    const usersFound = await prisma.user.findMany({
      where: {
        organizationId: teamId,
      },
      select: {
        username: true,
      },
    });

    takenSlugs = usersFound.map((user) => user.username);

    // If only one team is found and it has a parent, then it's an child team
    // and we can use the parent id to find all the teams that belong to this org
    if (teamsFound && teamsFound.length === 1 && teamsFound[0].parentId) {
      // Let's find all the teams that belong to this org
      const childTeams = await prisma.team.findMany({
        where: {
          // With this we include org team slug and child teams slugs
          OR: [{ id: teamsFound[0].parentId }, { parentId: teamsFound[0].parentId }],
        },
        select: {
          slug: true,
        },
      });
      takenSlugs = takenSlugs.concat(childTeams.map((team) => team.slug));
    } else {
      takenSlugs = takenSlugs.concat(teamsFound.map((team) => team.slug));
    }

    return !takenSlugs.includes(slugify(usernameSlug));
  } catch (error) {
    console.error(error);
    return false;
  }
};
