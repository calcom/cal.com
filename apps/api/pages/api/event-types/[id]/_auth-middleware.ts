import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import {
  schemaQueryIdParseInt,
  schemaQueryIdAsString,
} from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;

  const parsedId = schemaQueryIdParseInt.safeParse(req.query);
  const { id: slug } = schemaQueryIdAsString.parse(req.query);
  if (isAdmin) return;

  const idOrSlugQuery: { id?: int; slug?: string } = {};

  if (parsedId.success) {
    idOrSlugQuery.id = parsedId.data.id;
  } else {
    idOrSlugQuery.slug = slug;
  }

  const eventType = await prisma.eventType.findFirst({
    where: { idOrSlugQuery, users: { some: { id: userId } } },
  });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
