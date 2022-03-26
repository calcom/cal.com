import prisma from "@calcom/prisma";

import { EventType } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: EventType[];
  error?: unknown;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const eventTypes = await prisma.eventType.findMany();
    res.status(200).json({ data: { ...eventTypes } });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
