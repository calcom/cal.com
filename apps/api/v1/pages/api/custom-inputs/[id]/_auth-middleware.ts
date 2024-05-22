import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { id } = schemaQueryIdParseInt.parse(req.query);
  // Admins can just skip this check
  if (isSystemWideAdmin) return;
  // Check if the current user can access the event type of this input
  const eventTypeCustomInput = await prisma.eventTypeCustomInput.findFirst({
    where: { id, eventType: { userId } },
  });
  if (!eventTypeCustomInput) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
