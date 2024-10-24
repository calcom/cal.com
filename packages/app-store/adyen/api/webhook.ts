import { hmacValidator } from "@adyen/api-library";
import type {
  Notification,
  NotificationRequestItem,
} from "@adyen/api-library/lib/src/typings/notification/models";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import prisma from "@calcom/prisma";

import { appKeysSchema } from "../zod";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const bodyRaw = await getRawBody(req);
    const json = JSON.parse(bodyRaw.toString()) as Notification;

    const [notificationItem] = json.notificationItems;

    const payment = await prisma.payment.findFirst({
      where: {
        externalId: notificationItem.NotificationRequestItem.additionalData?.checkoutSessionId,
      },
      select: {
        id: true,
        amount: true,
        bookingId: true,
        data: true,
        booking: {
          select: {
            user: {
              select: {
                credentials: {
                  where: {
                    type: "adyen_payment",
                  },
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

    const userFromBooking = await prisma.booking.findUnique({
      where: {
        id: payment.bookingId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!userFromBooking) throw new Error("No user found");

    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "adyen",
        userId: userFromBooking?.userId,
      },
      select: {
        key: true,
      },
    });

    const parseCredentials = appKeysSchema.safeParse(credentials?.key);
    if (!parseCredentials.success) {
      throw new HttpCode({ statusCode: 500, message: "Credentials not valid" });
    }

    const validator = new hmacValidator();
    if (
      !validator.validateHMAC(
        json.notificationItems[0].NotificationRequestItem as NotificationRequestItem,
        parseCredentials.data.hmac_key
      )
    ) {
      throw new HttpCode({ statusCode: 404, message: "Invalid HMAC key" });
    }

    const _updatePayment = await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        data: {
          pspReference: notificationItem.NotificationRequestItem.pspReference,
        },
      },
    });

    return await handlePaymentSuccess(payment.id, payment.bookingId);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    return res.status(err.statusCode || 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}

const payerDataSchema = z
  .object({
    appId: z.string().optional(),
    referenceId: z.string().optional(),
  })
  .optional();
