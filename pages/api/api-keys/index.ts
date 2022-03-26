import prisma from "@calcom/prisma";

import { ApiKey } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: ApiKey[];
  error?: unknown;
  message?: string;
};

export default async function apiKeys(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { method } = req;
  if (method === "GET") {
    const apiKeys = await prisma.apiKey.findMany({});
    res.status(200).json({ data: { ...apiKeys } });
  } else res.status(405).json({ message: "Only GET Method allowed" });
}
