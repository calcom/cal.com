import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";

import { HttpError as HttpCode } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reference, status } = req.query;
  if (!reference) {
    throw new HttpCode({ statusCode: 204, message: "Reference not found" });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      externalId: reference as string,
    },
    select: {
      id: true,
      amount: true,
      bookingId: true,
      booking: {
        select: {
          uid: true,
          user: {
            select: {
              email: true,
              username: true,
              credentials: {
                where: {
                  type: "hitpay_payment",
                },
              },
            },
          },
          responses: true,
          eventType: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new HttpCode({ statusCode: 204, message: "Payment not found" });
  }
  const key = payment.booking?.user?.credentials?.[0].key;
  if (!key) {
    throw new HttpCode({ statusCode: 204, message: "Credential not found" });
  }

  if (!payment.booking || !payment.booking.user || !payment.booking.eventType || !payment.booking.responses) {
    throw new HttpCode({ statusCode: 204, message: "Booking not correct" });
  }

  if (status !== "completed") {
    const url = `/${payment.booking.user.username}/${payment.booking.eventType.slug}`;
    return res.redirect(url);
  }

  const queryParams = {
    "flag.coep": false,
    isSuccessBookingPage: true,
    email: (payment.booking.responses as { email: string }).email,
    eventTypeSlug: payment.booking.eventType.slug,
  };

  const query = qs.stringify(queryParams);
  const url = `/booking/${payment.booking.uid}?${query}`;

  return res.redirect(url);
}
