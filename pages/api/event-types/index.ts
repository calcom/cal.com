import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type EventTypeIdData = {
  events?: EventType[];
  error?: any;
};

const prisma = new PrismaClient();

export default async function eventType(req: NextApiRequest, res: NextApiResponse<EventTypeIdData>) {
  try {
    const eventTypes = await prisma.eventType.findMany({ where: { id: Number(req.query.eventTypeId) } });
    res.status(200).json({ events: { ...eventTypes } });
  } catch (error) {
    console.log(error);
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
