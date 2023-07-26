import getUserAdminTeams from "@calcom/features/ee/teams/lib/getUserAdminTeams";
import { HttpError } from "@calcom/lib/http-error";

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
  const teamsUserHasAdminAccessFor = await getUserAdminTeams({ userId });
  const hasAdminAccessToTeam = teamsUserHasAdminAccessFor.some((team) => team.id === teamId);

  if (!hasAdminAccessToTeam) {
    throw new HttpError({ statusCode: 401, message: "You must be an admin of the team to do this" });
  }
};
