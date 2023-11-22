import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";
import { schemaQueryIdParseInt } from "~/lib/validations/shared/queryIdTransformParseInt";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const idParse = schemaQueryIdParseInt.safeParse(req.query);
  const { id: slug } = schemaQueryIdAsString.parse(req.query);

  const id = idParse.success ? idParse.data.id : undefined;

  if (isAdmin) return;
  const eventType = await prisma.eventType.findFirst({
    where: { OR: [{ id }, { slug }], AND: { users: { some: { id: userId } } } },
  });
  if (!eventType) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
