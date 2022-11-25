import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  // Admins can just skip this check
  if (isAdmin) return;
  // Check if the current user can access the schedule
  const schedule = await prisma.schedule.findFirst({
    where: { id, userId },
  });
  if (!schedule) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
