import { HttpError } from "@calcom/lib/http-error";

export default async function checkParentEventOwnership(parentId: number, userId: number) {
  const parentEventType = await prisma.eventType.findUnique({
    where: {
      id: parentId,
    },
    select: {
      teamId: true,
    },
  });

  if (!parentEventType) {
    throw new HttpError({
      statusCode: 404,
      message: "Parent event type not found.",
    });
  }

  if (!parentEventType.teamId) {
    throw new HttpError({
      statusCode: 403,
      message: "Parent event type doesn't belong to any team.",
    });
  }

  const teamMember = await prisma.membership.findFirst({
    where: {
      teamId: parentEventType.teamId,
      userId: userId,
      OR: [{ role: "OWNER" }, { role: "ADMIN" }],
    },
  });

  if (!teamMember) {
    throw new HttpError({
      statusCode: 403,
      message: "User is not authorized to access the team to which the parent event type belongs.",
    });
  }
}
