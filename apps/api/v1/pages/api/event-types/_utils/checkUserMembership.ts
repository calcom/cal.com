import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { NextApiRequest } from "next";

/**
 * Checks if a user, identified by the provided userId, is a member of the team associated
 * with the event type identified by the parentId.
 *
 * @param req - The current request
 *
 * @throws {HttpError} If the event type is not found,
 *                     if the event type doesn't belong to any team,
 *                     or if the user isn't a member of the associated team.
 */
export default async function checkUserMembership(req: NextApiRequest) {
  const { body } = req;
  /** These are already parsed upstream, we can assume they're good here. */
  const parentId = Number(body.parentId);
  const userId = Number(body.userId);
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
      message: "Event type not found.",
    });
  }

  if (!parentEventType.teamId) {
    throw new HttpError({
      statusCode: 400,
      message: "This event type is not capable of having children.",
    });
  }

  const teamMember = await prisma.membership.findFirst({
    where: {
      teamId: parentEventType.teamId,
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
