import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { ApiKey } from "@calcom/prisma/client";
import { withMiddleware } from "@lib/helpers/withMiddleware";
import { schemaApiKey, withValidApiKey } from "@lib/validations/apiKey";


type ResponseData = {
  data?: ApiKey;
  error?: object;
};

async function createApiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const safe = schemaApiKey.safeParse(req.body);
  if (safe.success) {
    const data = await prisma.apiKey
      .create({ data: safe.data })
    if (data) res.status(201).json({ data })
    else (error: unknown) => res.status(400).json({ error: { message: "Could not create apiKey type", error: error } });
  }
}

export default withMiddleware("addRequestId","postOnly")(
  withValidApiKey(
    createApiKey
  )
);
