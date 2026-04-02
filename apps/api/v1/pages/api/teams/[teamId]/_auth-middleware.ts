import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import type { NextApiRequest } from "next";
import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { teamId } = schemaQueryTeamId.parse(req.query);
  /** Admins can skip the ownership verification */
  if (isSystemWideAdmin) return;
  /** Non-members will see a 404 error which may or not be the desired behavior. */
  await prisma.team.findFirstOrThrow({
    where: { id: teamId, members: { some: { userId } } },
  });
}

export async function checkPermissions(
  req: NextApiRequest,
  role: Prisma.MembershipWhereInput["role"] = MembershipRole.OWNER
) {
  const { userId, isSystemWideAdmin } = req;
  const { teamId } = schemaQueryTeamId.parse({
    teamId: req.query.teamId,
    version: req.query.version,
    apiKey: req.query.apiKey,
  });
  return canUserAccessTeamWithRole(userId, isSystemWideAdmin, teamId, role);
}

export async function canUserAccessTeamWithRole(
  userId: number,
  isSystemWideAdmin: boolean,
  teamId: number,
  role: Prisma.MembershipWhereInput["role"] = MembershipRole.OWNER
) {
  const args: Prisma.TeamFindFirstArgs = { where: { id: teamId } };
  /** If not ADMIN then we check if the actual user belongs to team and matches the required role */
  if (!isSystemWideAdmin) args.where = { ...args.where, members: { some: { userId, role } } };
  const team = await prisma.team.findFirst(args);
  if (!team) throw new HttpError({ statusCode: 401, message: `Unauthorized: OWNER or ADMIN role required` });
  return team;
}

export default authMiddleware;
