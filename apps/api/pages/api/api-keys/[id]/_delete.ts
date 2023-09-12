import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import { schemaQueryIdAsString } from "~/lib/validations/shared/queryIdString";

async function deleteHandler(req: NextApiRequest) {
  const { prisma, query } = req;
  const { id } = schemaQueryIdAsString.parse(query);
  await prisma.apiKey.delete({ where: { id } });
  return { message: `ApiKey with id: ${id} deleted` };
}

export default defaultResponder(deleteHandler);
