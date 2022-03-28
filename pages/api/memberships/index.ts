import prisma from "@calcom/prisma";

import { Membership } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Membership[];
  error?: unknown;
};

export default async function membership(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.membership.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
