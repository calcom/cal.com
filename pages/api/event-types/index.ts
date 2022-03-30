import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

type ResponseData = {
  data?: EventType[];
  message?: string;
  error?: unknown;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { method } = req;
  if (method === "GET") {
    const data = await prisma.eventType.findMany();
    res.status(200).json({ data });
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only GET Method allowed" });
  }
}
