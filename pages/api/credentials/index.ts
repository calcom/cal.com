import prisma from "@calcom/prisma";

import { Credential } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Credential[];
  error?: unknown;
};

export default async function credential(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.credential.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
