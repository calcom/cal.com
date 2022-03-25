import prisma from "@calcom/prisma";

import { ApiKey } from "@calcom/prisma/client";import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: ApiKey[];
  error?: unknown;
};

export default async function apiKey(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const apiKeys = await prisma.apiKey.findMany({});
    res.status(200).json({ data: { ...apiKeys } });
  } catch (error) {
    console.log(error);
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
