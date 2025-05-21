import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

/**
 * Checks if a user, identified by the provided userId, has ownership (or admin rights) over
 * the team associated with the event type identified by the parentId.
 *
 * @param req - The current request
 *
 * @throws {HttpError} If the parent event type is not found,
 *                     if the parent event type doesn't belong to any team,
 *                     or if the user doesn't have ownership or admin rights to the associated team.
 */
export default async function checkParentEventOwnership(req: NextApiRequest) {
  const { userId, body } = req;
  /** These are already parsed upstream, we can assume they're good here. */
  const parentId = Number(body.parentId);
  const parentEventType = await prisma.eventType.findUnique({
    where: { id: parentId },
    select: { teamId: true },
  });

  if (!parentEventType) {
    throw new HttpError({
      statusCode: 404,
      message: "Parent event type not found.",
    });
  }

  if (!parentEventType.teamId) {
    throw new HttpError({
      statusCode: 400,
      message: "This event type is not capable of having children",
    });
  }

  const teamMember = await prisma.membership.findFirst({
    where: {
      teamId: parentEventType.teamId,
      userId: userId,
      role: { in: ["ADMIN", "OWNER"] },
      accepted: true,
    },
  });

  if (!teamMember) {
    throw new HttpError({
      statusCode: 403,
      message: "User is not authorized to access the team to which the parent event type belongs.",
    });
  }
}
