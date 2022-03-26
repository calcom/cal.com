import prisma from "@calcom/prisma";

import { Availability } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Availability[];
  error?: unknown;
};

export default async function availability(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const availabilities = await prisma.availability.findMany();
    res.status(200).json({ data: { ...availabilities } });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
