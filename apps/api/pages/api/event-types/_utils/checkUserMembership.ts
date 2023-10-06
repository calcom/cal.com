import { HttpError } from "@calcom/lib/http-error";

export default async function checkUserMembership(parentId: number, userId: number) {
  // Get the event type with the given parentId
  const parentEventType = await prisma.eventType.findUnique({
    where: {
      id: parentId,
    },
    select: {
      teamId: true,
    },
  });

  // If the parent event type is not found, throw an error
  if (!parentEventType) {
    throw new HttpError({
      statusCode: 404,
      message: "Event type not found.",
    });
  }

  // If the parent event type doesn't have an associated teamId, throw an error
  if (!parentEventType.teamId) {
    throw new HttpError({
      statusCode: 403,
      message: "Event type doesn't belong to any team.",
    });
  }

  // Check if the user is a member of the team associated with the parent event type
  const teamMember = await prisma.membership.findFirst({
    where: {
      teamId: parentEventType.teamId,
      userId: userId,
      accepted: true,
    },
  });

  // If the user is not a member of the team, throw an error
  if (!teamMember) {
    throw new HttpError({
      statusCode: 403,
      message: "User is not a member of the team associated with the event type.",
    });
  }
}
