import { HttpError } from "@calcom/lib/http-error";

export default async function isUserMemberOfTeam(teamId?: number | null, userId?: number) {
  if (!teamId || !userId) {
    throw new HttpError({
      statusCode: 400,
      message: "Bad request.",
    });
  }
  const teamMember = await prisma.membership.findFirst({
    where: {
      teamId: teamId,
      userId: userId,
      accepted: true,
    },
  });

  if (!teamMember) {
    throw new HttpError({
      statusCode: 400,
      message: "User is not a team member.",
    });
  }
}
