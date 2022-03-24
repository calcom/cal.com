import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { EventType } from "@calcom/prisma/client";

type Data = {
  event?: EventType;
  error?: any;
};

export default async function eventType(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    const event = await prisma.eventType.findUnique({ where: { id: Number(req.query.id) } });
    res.status(200).json({ event });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error });
  }
}
