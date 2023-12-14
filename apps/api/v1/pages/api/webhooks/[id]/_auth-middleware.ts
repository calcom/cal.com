import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { id } = schemaQueryIdAsString.parse(req.query);
  // Admins can just skip this check
  if (isAdmin) return;
  // Check if the current user can access the webhook
  const webhook = await prisma.webhook.findFirst({
    where: { id, appId: null, OR: [{ userId }, { eventType: { team: { members: { some: { userId } } } } }] },
  });
  if (!webhook) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
