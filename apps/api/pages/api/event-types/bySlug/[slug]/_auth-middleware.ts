import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQuerySlugAsString } from "~/lib/validations/shared/querySlugString";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { slug } = schemaQuerySlugAsString.parse(req.query);
  if (isAdmin) return;
  const eventType = await prisma.eventType.findFirst({
    where: { slug, users: { some: { id: userId } } },
  });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
