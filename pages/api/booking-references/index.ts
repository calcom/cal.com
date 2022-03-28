import prisma from "@calcom/prisma";

import { BookingReference } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  data?: BookingReference[];
  error?: unknown;
};

export default async function bookingReference(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const data = await prisma.bookingReference.findMany();
  if (data) res.status(200).json({ data });
  else res.status(400).json({ error: "No data found" });
}
