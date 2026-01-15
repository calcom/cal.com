import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

import { apiKeyPublicSchema } from "~/lib/validations/api-key";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

type CustomNextApiRequest = NextApiRequest & {
  args?: Prisma.ApiKeyFindManyArgs;
};

/** Admins can query other users' API keys */
function handleAdminRequests(req: CustomNextApiRequest) {
  // To match type safety with runtime
  if (!hasReqArgs(req)) throw Error("Missing req.args");
  const { userId, isSystemWideAdmin } = req;
  if (isSystemWideAdmin && req.query.userId) {
    const query = schemaQuerySingleOrMultipleUserIds.parse(req.query);
    const userIds = Array.isArray(query.userId) ? query.userId : [query.userId || userId];
    req.args.where = { userId: { in: userIds } };
    if (Array.isArray(query.userId)) req.args.orderBy = { userId: "asc" };
  }
}

function hasReqArgs(req: CustomNextApiRequest): req is Ensure<CustomNextApiRequest, "args"> {
  return "args" in req;
}

async function getHandler(req: CustomNextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  req.args = isSystemWideAdmin ? {} : { where: { userId } };
  // Proof of concept: allowing mutation in exchange of composability
  handleAdminRequests(req);
  const data = await prisma.apiKey.findMany(req.args);
  return { api_keys: data.map((v) => apiKeyPublicSchema.parse(v)) };
}

export default defaultResponder(getHandler);
