import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ErrorCode } from "@calcom/lib/errorCodes";
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
    throw new ErrorWithCode(ErrorCode.Unauthorized, "You must be an admin of the team to do this");
  }
};
