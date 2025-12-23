import type { NextApiRequest } from "next";

import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { membershipIdSchema } from "~/lib/validations/membership";

/**
 * @swagger
 * /memberships/{userId}_{teamId}:
 *   delete:
 *     summary: Remove an existing membership
 *     parameters:
 *      - in: path
 *        name: userId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric userId of the membership to get
 *      - in: path
 *        name: teamId
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric teamId of the membership to get
 *     tags:
 *     - memberships
 *     responses:
 *       201:
 *         description: OK, membership removed successfully
 *       400:
 *        description: Bad request. Membership id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function deleteHandler(req: NextApiRequest) {
  const { query } = req;
  const userId_teamId = membershipIdSchema.parse(query);
  await checkPermissions(req);

  // Check if the team is an organization to pass the correct isOrg flag
  const team = await prisma.team.findUnique({
    where: { id: userId_teamId.teamId },
    select: { isOrganization: true },
  });

  // Use TeamService.removeMembers to properly clean up hosts and managed event types
  await TeamService.removeMembers({
    teamIds: [userId_teamId.teamId],
    userIds: [userId_teamId.userId],
    isOrg: team?.isOrganization ?? false,
  });

  return { message: `Membership with id: ${query.id} deleted successfully` };
}

async function checkPermissions(req: NextApiRequest) {
  const { isSystemWideAdmin, userId, query } = req;
  const userId_teamId = membershipIdSchema.parse(query);
  // Admin User can do anything including deletion of Admin Team Member in any team
  if (isSystemWideAdmin) {
    return;
  }

  // Owner can delete Admin and Member
  // Admin Team Member can delete Member
  // Member can't delete anyone
  const PRIVILEGE_ORDER = ["OWNER", "ADMIN", "MEMBER"];

  const memberShipToBeDeleted = await prisma.membership.findUnique({
    where: { userId_teamId },
  });

  if (!memberShipToBeDeleted) {
    throw new HttpError({ statusCode: 404, message: "Membership not found" });
  }

  // If a user is deleting their own membership, then they can do it
  if (userId === memberShipToBeDeleted.userId) {
    return;
  }

  const currentUserMembership = await prisma.membership.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId: memberShipToBeDeleted.teamId,
      },
    },
  });

  if (!currentUserMembership) {
    // Current User isn't a member of the team
    throw new HttpError({ statusCode: 403, message: "You are not a member of the team" });
  }

  if (
    PRIVILEGE_ORDER.indexOf(memberShipToBeDeleted.role) === -1 ||
    PRIVILEGE_ORDER.indexOf(currentUserMembership.role) === -1
  ) {
    throw new HttpError({ statusCode: 400, message: "Invalid role" });
  }

  // If Role that is being deleted comes before the current User's Role, or it's the same ROLE, throw error
  if (
    PRIVILEGE_ORDER.indexOf(memberShipToBeDeleted.role) <= PRIVILEGE_ORDER.indexOf(currentUserMembership.role)
  ) {
    throw new HttpError({
      statusCode: 403,
      message: "You don't have the appropriate role to delete this membership",
    });
  }
}

export default defaultResponder(deleteHandler);
