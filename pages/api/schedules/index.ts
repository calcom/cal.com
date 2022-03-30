import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Schedule } from "@calcom/prisma/client";

type ResponseData = {
  data?: Schedule[];
  error?: unknown;
};

export default async function schedule(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.schedule.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
