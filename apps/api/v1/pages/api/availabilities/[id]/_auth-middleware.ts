import type { NextApiRequest } from "next";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, prisma, isAdmin, query } = req;
  const { id } = schemaQueryIdParseInt.parse(query);
  /** Admins can skip the ownership verification */
  if (isAdmin) return;
  /**
   * There's a caveat here. If the availability exists but the user doesn't own it,
   * the user will see a 404 error which may or not be the desired behavior.
   */
  await prisma.availability.findFirstOrThrow({
    where: { id, Schedule: { userId } },
  });
}

export default authMiddleware;
