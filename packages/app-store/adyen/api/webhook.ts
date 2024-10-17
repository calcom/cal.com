import { hmacValidator, Types } from "@adyen/api-library";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import prisma from "@calcom/prisma";

import { adyenCredentialKeysSchema } from "../lib/types";

const EventCodeEnum = Types.notification.NotificationRequestItem.EventCodeEnum;

export const config = {
  api: {
    bodyParser: false,
  },
};

const eventSchema = z
  .object({
    live: z.string(),
    notificationItems: z.array(
      z.object({
        NotificationRequestItem: z.object({
          eventCode: z.nativeEnum(EventCodeEnum),
          merchantAccountCode: z.string(),
          amount: z.object({
            currency: z.string(),
            value: z.number(),
          }),
          merchantReference: z.string(),
          pspReference: z.string(),
          success: z.nativeEnum(Types.notification.NotificationRequestItem.SuccessEnum),
          paymentMethod: z.string(),
          additionalData: z.object({
            hmacSignature: z.string(),
            expiryDate: z.string().optional(),
            authCode: z.string().optional(),
            cardBin: z.string().optional(),
            cardSummary: z.string().optional(),
            checkoutSessionId: z.string().optional(),
          }),
          operations: z
            .array(z.nativeEnum(Types.notification.NotificationRequestItem.OperationsEnum))
            .optional(),
          reason: z.string().optional(),
          eventDate: z.string(),
        }),
      })
    ),
  })
  .passthrough();

export const findPaymentCredentials = async (userId: number): Promise<{ hmacKey: string }> => {
  try {
    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "adyen",
        userId: userId,
      },
      select: {
        key: true,
      },
    });
    if (!credentials) {
      throw new Error("No credentials found");
    }
    const parsedCredentials = adyenCredentialKeysSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      hmacKey: parsedCredentials.data.hmac_key,
    };
  } catch (err) {
    console.error(err);
    return {
      hmacKey: "",
    };
  }
};

export async function handleAdyenPaymentSuccess(notificationItem: Types.notification.NotificationItem) {
  const payment = await prisma.payment.findFirst({
    where: {
      uid: notificationItem.NotificationRequestItem.merchantReference,
    },
    select: {
      id: true,
      bookingId: true,
    },
  });

  if (!payment?.bookingId) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  const booking = await prisma.booking.findUnique({
    where: {
      id: payment.bookingId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });
  const foundCredentials = await findPaymentCredentials(booking.userId || -1);

  if (!foundCredentials) throw new HttpCode({ statusCode: 204, message: "No credentials found" });
  const { hmacKey } = foundCredentials;

  //verify HMAC Signature
  const validator = new hmacValidator();
  if (!validator.validateHMAC(notificationItem.NotificationRequestItem, hmacKey)) {
    throw new HttpCode({ statusCode: 400, message: "Bad Request" });
  }

  return await handlePaymentSuccess(payment.id, payment.bookingId);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const bodyRaw = await getRawBody(req);
    const headers = req.headers;
    const bodyAsString = bodyRaw.toString();

    const parse = eventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;

    parsedPayload.notificationItems.forEach(async (notificationItem) => {
      if (notificationItem.NotificationRequestItem.eventCode === EventCodeEnum.Authorisation) {
        await handleAdyenPaymentSuccess(notificationItem);
      }
    });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).end();
}
