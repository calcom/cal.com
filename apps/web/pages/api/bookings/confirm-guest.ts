import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { totpRawCheck } from "@calcom/lib/totp";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  email: z.string().email(),
  bookingUid: z.string(),
  code: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, bookingUid, code } = querySchema.parse(req.query);

    const secret = createHash("md5")
      .update(email + process.env.CALENDSO_ENCRYPTION_KEY)
      .digest("hex");

    const isValidToken = totpRawCheck(code, secret, { step: 900 });

    if (!isValidToken) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=invalid_code`);
    }

    const booking = await prisma.booking.findUnique({
      where: { uid: bookingUid },
      include: {
        pendingGuests: true,
        attendees: true,
      },
    });

    if (!booking) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=booking_not_found`);
    }

    const pendingGuest = booking.pendingGuests.find((g) => g.email === email);

    if (!pendingGuest) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=guest_not_found`);
    }

    if (booking.attendees.some((a) => a.email === email)) {
      return res.redirect(`${WEBAPP_URL}/booking/guest-confirmed?already=true`);
    }

    await prisma.attendee.create({
      data: {
        email: pendingGuest.email,
        name: pendingGuest.name,
        timeZone: pendingGuest.timeZone,
        locale: pendingGuest.locale,
        bookingId: booking.id,
      },
    });

    await prisma.pendingGuest.delete({
      where: { id: pendingGuest.id },
    });

    return res.redirect(`${WEBAPP_URL}/booking/guest-confirmed`);
  } catch (error) {
    console.error("Error confirming guest:", error);
    return res.redirect(`${WEBAPP_URL}/booking/guest-confirmation-failed?reason=server_error`);
  }
}
