import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { MembershipRole } from "@calcom/prisma/enums";

import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";

async function authMiddleware(req: NextApiRequest) {
  const { userId, prisma, isAdmin } = req;
  const { teamId } = schemaQueryTeamId.parse(req.query);
  /** Admins can skip the ownership verification */
  if (isAdmin) return;
  /** Non-members will see a 404 error which may or not be the desired behavior. */
  await prisma.team.findFirstOrThrow({
    where: { id: teamId, members: { some: { userId } } },
  });
}

export async function checkPermissions(
  req: NextApiRequest,
  role: Prisma.MembershipWhereInput["role"] = MembershipRole.OWNER
) {
  const { userId, prisma, isAdmin } = req;
  const { teamId } = schemaQueryTeamId.parse({
    teamId: req.query.teamId,
    version: req.query.version,
    apiKey: req.query.apiKey,
  });
  return canUserAccessTeamWithRole(prisma, userId, isAdmin, teamId, role);
}

export async function canUserAccessTeamWithRole(
  prisma: NextApiRequest["prisma"],
  userId: number,
  isAdmin: boolean,
  teamId: number,
  role: Prisma.MembershipWhereInput["role"] = MembershipRole.OWNER
) {
  const args: Prisma.TeamFindFirstArgs = { where: { id: teamId } };
  /** If not ADMIN then we check if the actual user belongs to team and matches the required role */
  if (!isAdmin) args.where = { ...args.where, members: { some: { userId, role } } };
  const team = await prisma.team.findFirst(args);
  if (!team) throw new HttpError({ statusCode: 401, message: `Unauthorized: ${role.toString()} required` });
  return team;
}

export default authMiddleware;
