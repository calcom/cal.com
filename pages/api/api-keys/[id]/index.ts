import prisma from "@calcom/prisma";

import { ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaQueryIdAsString, withValidQueryIdString } from "@lib/validations/shared/queryIdString";

type ResponseData = {
  data?: ApiKey;
  message?: string;
  error?: unknown;
};

export async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdAsString.safeParse(query);
  if (method === "GET" && safe.success) {
      const apiKey = await prisma.apiKey.findUnique({ where: { id: safe.data.id } });
      if (!apiKey) res.status(404).json({ message: "API key was not found" });
      else res.status(200).json({ data: apiKey });
    // Reject any other HTTP method than POST
  } else res.status(405).json({ message: "Only GET Method allowed" });
}


export default withValidQueryIdString(apiKey);
