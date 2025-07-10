import { HttpError } from "@calcom/lib/http-error";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

export const throwIfNotHaveAdminAccessToTeam = async ({
  teamId,
  userId,
}: {
  teamId: number | null;
  userId: number;
}) => {
  if (!teamId) {
    return;
  }
  const userRepo = new UserRepository(prisma);
  const userAdminTeams = await userRepo.getUserAdminTeams({ userId });
  const teamsUserHasAdminAccessFor = userAdminTeams?.teams?.map(({ team }) => team.id) ?? [];
  const hasAdminAccessToTeam = teamsUserHasAdminAccessFor.some((id) => id === teamId);

  if (!hasAdminAccessToTeam) {
    throw new HttpError({ statusCode: 401, message: "You must be an admin of the team to do this" });
  }
};
