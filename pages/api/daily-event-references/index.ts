import prisma from "@calcom/prisma";

import { DailyEventReference } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: DailyEventReference[];
  error?: unknown;
};

export default async function dailyEventReference(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.dailyEventReference.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
