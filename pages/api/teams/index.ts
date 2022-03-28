import prisma from "@calcom/prisma";

import { Team } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Team[];
  error?: unknown;
};

export default async function team(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const data = await prisma.team.findMany();
    res.status(200).json({ data });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
