import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { ApiKey } from "@calcom/prisma/client";

import { withMiddleware } from "@lib/helpers/withMiddleware";

type ResponseData = {
  data?: ApiKey[];
  error?: unknown;
};

async function allApiKeys(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.apiKey.findMany();

  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}

export default withMiddleware("addRequestId", "HTTP_GET")(allApiKeys);
