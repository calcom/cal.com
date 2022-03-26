import prisma from "@calcom/prisma";

import { Booking } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: Booking[];
  error?: unknown;
};

export default async function booking(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    const bookings = await prisma.booking.findMany();
    res.status(200).json({ data: { ...bookings } });
  } catch (error) {
    // FIXME: Add zod for validation/error handling
    res.status(400).json({ error: error });
  }
}
