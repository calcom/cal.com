import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { SelectedCalendar } from "@calcom/prisma/client";

type ResponseData = {
  data?: SelectedCalendar[];
  error?: unknown;
};

export default async function selectedCalendar(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.selectedCalendar.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
