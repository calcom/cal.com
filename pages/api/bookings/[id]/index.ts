import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { Booking } from "@calcom/prisma/client";

import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

type ResponseData = {
  data?: Booking;
  message?: string;
  error?: unknown;
};

export async function booking(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { query, method } = req;
  const safe = await schemaQueryIdParseInt.safeParse(query);

  if (method === "GET" && safe.success) {
    const booking = await prisma.booking.findUnique({ where: { id: safe.data.id } });

    if (booking) res.status(200).json({ data: booking });
    if (!booking) res.status(404).json({ message: "Event type not found" });
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ message: "Only GET Method allowed" });
  }
}

export default withValidQueryIdTransformParseInt(booking);
