import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import { apiKeyEditBodySchema, apiKeyPublicSchema } from "~/lib/validations/api-key";
import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

async function patchHandler(req: NextApiRequest) {
  const { body } = req;
  const { id } = schemaQueryIdAsString.parse(req.query);
  const data = apiKeyEditBodySchema.parse(body);
  const api_key = await prisma.apiKey.update({ where: { id }, data });
  return { api_key: apiKeyPublicSchema.parse(api_key) };
}

export default defaultResponder(patchHandler);
