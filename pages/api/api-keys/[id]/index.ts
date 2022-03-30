import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { ApiKey } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

type ResponseData = {
  data?: ApiKey;
  error?: unknown;
};

export async function apiKeyById(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (safe.success) {
    const data = await prisma.apiKey.findUnique({ where: { id: safe.data.id } });

    if (data) res.status(200).json({ data });
    else res.status(404).json({ error: { message: "ApiKey was not found" } });
  }
}

export default withMiddleware("addRequestId", "HTTP_GET")(withValidQueryIdString(apiKeyById));
