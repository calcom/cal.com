import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { DestinationCalendar } from "@calcom/prisma/client";

type ResponseData = {
  data?: DestinationCalendar[];
  error?: unknown;
};

export default async function destinationCalendar(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.destinationCalendar.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
