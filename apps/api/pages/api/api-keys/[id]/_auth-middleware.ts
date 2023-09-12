import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

export async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { id } = schemaQueryIdAsString.parse(req.query);
  // Admin can check any api key
  if (isAdmin) return;
  // Check if user can access the api key
  const apiKey = await prisma.apiKey.findFirst({
    where: { id, userId },
  });
  if (!apiKey) throw new HttpError({ statusCode: 404, message: "API key not found" });
}
