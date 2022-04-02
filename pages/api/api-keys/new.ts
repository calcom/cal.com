import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { ApiKey } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaApiKeyBodyParams, withValidApiKey } from "@lib/validations/api-key";

type ResponseData = {
  data?: ApiKey;
  error?: unknown;
};

async function createApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = schemaApiKeyBodyParams.safeParse(req.body);
  if (safe.success) {
    const data = await prisma.apiKey.create({ data: safe.data });
    if (data) res.status(201).json({ data });
    else
      (error: unknown) => res.status(400).json({ error: { message: "Could not create apiKey type", error } });
  }
}

export default withMiddleware("addRequestId", "HTTP_POST")(withValidApiKey(createApiKey));
