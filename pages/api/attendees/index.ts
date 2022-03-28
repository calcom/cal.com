import prisma from "@calcom/prisma";

import { Attendee } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Attendee[];
  error?: unknown;
};

export default async function attendee(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const data = await prisma.attendee.findMany();
    res.status(200).json({ data });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
