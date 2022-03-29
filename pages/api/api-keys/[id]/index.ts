import prisma from "@calcom/prisma";

import { ApiKey } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";
import { withMiddleware } from "@lib/helpers/withMiddleware";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function apiKeyById(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = await schemaQueryIdAsString.safeParse(req.query);
  if (safe.success) {
    const data = await prisma.apiKey.findUnique({ where: { id: safe.data.id } });

    if (data) res.status(200).json({ data });
    else res.status(404).json({ message: "ApiKey was not found" });
  }
}


export default withMiddleware("addRequestId","getOnly")(
  withValidQueryIdString(
    apiKeyById
  )
);
