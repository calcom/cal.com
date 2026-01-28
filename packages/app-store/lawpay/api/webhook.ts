import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { lawpayCredentialKeysSchema } from "@calcom/app-store/lawpay/lib";
import LawPay from "@calcom/app-store/lawpay/lib/LawPay";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

import appConfig from "../config.json";

export const config = {
  api: { bodyParser: false },
};

const eventSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    status: z.string(),
    amount: z.number().optional(),
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const bodyRaw = await getRawBody(req);
    const payload = eventSchema.parse(JSON.parse(bodyRaw.toString()));

    if (payload.type === "transaction.completed" || payload.type === "transaction.authorized") {
      const payment = await prisma.payment.findFirst({
        where: { externalId: payload.data.id },
        select: { id: true, bookingId: true },
      });

      if (!payment?.bookingId) {
        throw new HttpCode({ statusCode: 204, message: "Payment not found" });
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { success: true },
      });

      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: "ACCEPTED" },
      });

      await handlePaymentSuccess({
        paymentId: payment.id,
        bookingId: payment.bookingId,
        appSlug: appConfig.slug,
      });
    }

    res.status(200).end();
  } catch (error) {
    console.error("LawPay webhook error:", error);
    res.status(200).json({ message: error instanceof Error ? error.message : "Unknown error" });
  }
}
