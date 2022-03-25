import { PrismaClient, EventType } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
type ResponseData = {
  data?: EventType[];
  error?: unknown;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const eventTypes = await prisma.eventType.findMany({ where: { id: Number(req.query.eventTypeId) } });
    res.status(200).json({ data: { ...eventTypes } });
  } catch (error) {
    console.log(error);
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
