import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import prisma from "@calcom/prisma";

const schema = z.object({
  bookingUid: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingUid, email, name } = schema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const guestSession = await prisma.videoCallGuest.upsert({
      where: {
        bookingUid_email: {
          bookingUid,
          email,
        },
      },
      update: { name },
      create: { bookingUid, email, name },
    });

    return res.json({ guestSessionId: guestSession.id });
  } catch (error) {
    console.error("Error creating guest session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}