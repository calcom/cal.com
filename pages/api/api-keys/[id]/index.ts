import prisma from "@calcom/prisma";

import { ApiKey } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryId, withValidQueryIdString } from "@lib/validations/queryIdString";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryId.safeParse(query);
  if (safe.success) {
    if (method === "GET") {
      const apiKey = await prisma.apiKey.findUnique({ where: { id: safe.data.id } });

      if (apiKey) res.status(200).json({ data: apiKey });
      if (!apiKey) res.status(404).json({ message: "API key was not found" });
    } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only GET Method allowed" });
    }
  }
}


export default withValidQueryIdString(apiKey);
