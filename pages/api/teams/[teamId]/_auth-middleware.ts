import type { NextApiRequest } from "next";

import { schemaQueryTeamId } from "@lib/validations/shared/queryTeamId";

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

export default authMiddleware;
