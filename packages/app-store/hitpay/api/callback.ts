import type { NextApiRequest, NextApiResponse } from "next";
import qs from "qs";
import { z } from "zod";

import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import prisma from "@calcom/prisma";

const PaymentDataSchema = z.object({
  id: z.string(),
  url: z.string(),
  defaultLink: z.string(),
  email: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { reference, status } = req.query;
    if (!reference) {
      throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Reference not found");
    }

    const payment = await prisma.payment.findFirst({
      where: {
        externalId: reference as string,
      },
      select: {
        id: true,
        amount: true,
        bookingId: true,
        data: true,
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
      throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Payment not found");
    }
    const key = payment.booking?.user?.credentials?.[0].key;
    if (!key) {
      throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Credential not found");
    }

    if (!payment.booking || !payment.booking.user || !payment.booking.eventType) {
      throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Booking not correct");
    }

    if (status !== "completed") {
      await prisma.booking.update({
        where: {
          id: payment.bookingId,
        },
        data: {
          status: "CANCELLED",
        },
      });
      const url = `/${payment.booking.user.username}/${payment.booking.eventType.slug}`;
      return res.redirect(url);
    }

    const parsedData = PaymentDataSchema.parse(payment.data);
    const queryParams = {
      "flag.coep": false,
      isSuccessBookingPage: true,
      email: parsedData.email,
      eventTypeSlug: payment.booking.eventType.slug,
    };

    const query = qs.stringify(queryParams);
    const url = `/booking/${payment.booking.uid}?${query}`;

    return res.redirect(url);
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    console.error(`Callback Error: ${err.message}`);
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }
}
