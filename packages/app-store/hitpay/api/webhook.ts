import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import prisma from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

interface WebhookReturn {
  payment_id: string;
  payment_request_id: string;
  phone: string;
  amount: string;
  currency: string;
  status: string;
  reference_number: string;
  hmac: string;
}

type ExcludedWebhookReturn = Omit<WebhookReturn, "hmac">;

function generateSignatureArray<T>(secret: string, vals: T) {
  const source: string[] = [];
  Object.keys(vals as { [K: string]: string })
    .sort()
    .forEach((key) => {
      source.push(`${key}${(vals as { [K: string]: string })[key]}`);
    });
  const payload = source.join("");
  const hmac = createHmac("sha256", secret);
  const signed = hmac.update(payload, "utf-8").digest("hex");
  return signed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const obj: WebhookReturn = req.body as WebhookReturn;
    const excluded = { ...obj } as Partial<WebhookReturn>;
    delete excluded.hmac;

    const payment = await prisma.payment.findFirst({
      where: {
        externalId: obj.payment_request_id,
      },
      select: {
        id: true,
        amount: true,
        bookingId: true,
        booking: {
          select: {
            user: {
              select: {
                credentials: {
                  where: {
                    type: "hitpay_payment",
                  },
                },
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
      throw new HttpCode({ statusCode: 204, message: "Credentials not found" });
    }
    const { salt_key } = key as { salt_key: string };
    const signed = generateSignatureArray(salt_key, excluded as ExcludedWebhookReturn);
    if (signed !== obj.hmac) {
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    return await handlePaymentSuccess(payment.id, payment.bookingId);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    return res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
  }
}
