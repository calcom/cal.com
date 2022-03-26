import prisma from "@calcom/prisma";

import { ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/queryIdString";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdAsString.safeParse(query);
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
