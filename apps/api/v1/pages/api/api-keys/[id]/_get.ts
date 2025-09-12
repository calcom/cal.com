import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";

import { safeApiKeySelect } from "~/lib/selects/apiKeySelect";
import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

async function getHandler(req: NextApiRequest) {
  const { query } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  const api_key = await prisma.apiKey.findUniqueOrThrow({ where: { id }, select: safeApiKeySelect });
  return { api_key };
}

export default defaultResponder(getHandler);
