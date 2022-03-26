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
  // try {
    const apiKeys = await prisma.apiKey.findMany({});
    res.status(200).json({ data: { ...apiKeys } });
    // Without any params this never fails. not sure how to force test unavailable prisma query
  // } catch (error) {
  //   // FIXME: Add zod for validation/error handling 
  //   res.status(400).json({ error: error });
  // }
    
  } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only GET Method allowed" });
    }
}
