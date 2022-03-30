import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Booking } from "@calcom/prisma/client";

type ResponseData = {
  data?: Booking[];
  error?: unknown;
};

export default async function booking(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const data = await prisma.booking.findMany();
    res.status(200).json({ data });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
