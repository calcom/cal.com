import prisma from "@calcom/prisma";

import { Booking } from "@calcom/prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { schemaBooking, withValidBooking } from "@lib/validations/booking";

type ResponseData = {
  data?: Booking;
  message?: string;
  error?: string;
};

async function createBooking(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const { body, method } = req;
  if (method === "POST") {
    const safe = schemaBooking.safeParse(body);
    if (safe.success && safe.data) {
      await prisma.booking
        .create({ data: safe.data })
        .then((booking) => res.status(201).json({ data: booking }))
        .catch((error) => res.status(400).json({ message: "Could not create booking type", error: error }));
    }
  } else {
    // Reject any other HTTP method than POST
    res.status(405).json({ error: "Only POST Method allowed" });
  }
}

export default withValidBooking(createBooking);
