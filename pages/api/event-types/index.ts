import prisma from "@calcom/prisma";

import { EventType } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: EventType[];
  message?: string;
  error?: unknown;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { method } = req;
  if (method === "GET") {
    const eventTypes = await prisma.eventType.findMany();
    res.status(200).json({ data: { ...eventTypes } });
  } else {
      // Reject any other HTTP method than POST
      res.status(405).json({ message: "Only GET Method allowed" });
    }
}
