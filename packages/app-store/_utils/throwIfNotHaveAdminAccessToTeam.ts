import { HttpError } from "@calcom/lib/http-error";
import { UserRepository } from "@calcom/lib/server/repository/user";

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
  const teamsUserHasAdminAccessFor = await UserRepository.getUserAdminTeams(userId);
  const hasAdminAccessToTeam = teamsUserHasAdminAccessFor.some((id) => id === teamId);

  if (!hasAdminAccessToTeam) {
    throw new HttpError({ statusCode: 401, message: "You must be an admin of the team to do this" });
  }
};
