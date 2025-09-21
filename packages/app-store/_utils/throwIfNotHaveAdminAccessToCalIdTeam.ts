import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

export const throwIfNotHaveAdminAccessToCalIdTeam = async ({
  teamId,
  userId,
}: {
  teamId: number | null;
  userId: number;
}) => {
  if (!teamId) {
    return;
  }

  // Check if user has admin access to the calIdTeam
  const calIdMembership = await prisma.calIdMembership.findFirst({
    where: {
      userId: userId,
      calIdTeamId: teamId,
      acceptedInvitation: true,
      OR: [{ role: "ADMIN" }, { role: "OWNER" }],
    },
  });

  if (!calIdMembership) {
    throw new HttpError({ statusCode: 401, message: "You must be an admin of the team to do this" });
  }
};
