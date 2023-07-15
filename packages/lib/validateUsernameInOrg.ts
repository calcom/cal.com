import prisma from "@calcom/prisma";

import slugify from "./slugify";

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
        metadata: true,
      },
    });

    /** TODO:
     * Is there a thing that child teams can have more teams?
     * If yes then I need to find recursively all the teams that belong to this org
     */

    // If only one team is found and it has a parent, then it's an child team
    // and we can use the parent id to find all the teams that belong to this org
    if (teamsFound && teamsFound.length === 1 && teamsFound[0].parentId) {
      // Let's find all the teams that belong to this org
      const childTeams = await prisma.team.findMany({
        where: {
          parentId: teamsFound[0].parentId,
        },
        select: {
          slug: true,
        },
      });
      takenSlugs = childTeams.map((team) => team.slug);
    } else {
      takenSlugs = teamsFound.map((team) => team.slug);
    }

    return !takenSlugs.includes(slugify(usernameSlug));
  } catch (error) {
    console.error(error);
    return false;
  }
};
