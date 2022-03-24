import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

type Data = {
  events?: EventType[];
  error?: any;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const eventTypes = await prisma.eventType.findMany({ where: { id: Number(req.query.eventTypeId) } });
    res.status(200).json({ events: { ...eventTypes } });
  } catch (error) {
    console.log(error);
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
