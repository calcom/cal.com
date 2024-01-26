import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQuerySlug } from "~/lib/validations/shared/querySlug";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { slug, ownerId } = schemaQuerySlug.parse(req.query);

  const effectiveUserId = isAdmin && ownerId ? ownerId : userId;

  const eventType = await prisma.eventType.findFirst({
    where: { slug },
    include: {
      users: {
        select: { id: true },
      },
    },
  });

  if (!eventType) {
    throw new HttpError({ statusCode: 404, message: "Event type not found" });
  }

  const isAuthorized = isAdmin || eventType.users.some((user) => user.id === effectiveUserId);

  if (!isAuthorized) {
    throw new HttpError({ statusCode: 403, message: "Forbidden" });
  }
}

export default authMiddleware;
