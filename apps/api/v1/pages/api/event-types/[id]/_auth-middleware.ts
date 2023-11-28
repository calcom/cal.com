import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  if (isAdmin) return;
  const eventType = await prisma.eventType.findFirst({
    where: { id, users: { some: { id: userId } } },
  });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
