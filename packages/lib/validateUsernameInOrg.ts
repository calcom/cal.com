export const validateUsernameInOrg = async (usernameSlug: string, teamId: number): Promise<boolean> => {
  try {
    const prisma = await import("@calcom/prisma").then((mod) => mod.default);
    let takenSlugs = [];
    const teamFound = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      select: {
        slug: true,
        parentId: true,
      },
    });

    // TODO:
    // Is there a thing that child teams can have more teams?
    // If yes then I need to find recursively all the teams that belong to this org
    if (teamFound && teamFound?.parentId) {
      // Let's find all the teams that belong to this org
      const teamsFound = await prisma.team.findMany({
        where: {
          parentId: teamFound.parentId,
        },
        select: {
          slug: true,
        },
      });
      takenSlugs = teamsFound.map((team) => team.slug);
    } else {
      takenSlugs = [teamFound?.slug];
    }

    return !takenSlugs.includes(usernameSlug);
  } catch (error) {
    console.error(error);
    return false;
  }
};
