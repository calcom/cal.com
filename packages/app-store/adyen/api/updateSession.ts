import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import prisma from "@calcom/prisma";

import { createPaymentSession } from "../lib/client/createPaymentSession";
import { adyenCredentialKeysSchema, adyenPaymentDataSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new Error("Invalid method");
    }

    const parseRequest = requestSchema.safeParse(req.body);
    if (!parseRequest.success) {
      throw new Error(`Request is malformed: ${parseRequest.error}`);
    }

    const { paymentUid } = parseRequest.data;

    // Get payment,
    const payment = await prisma.payment.findUnique({
      where: {
        uid: paymentUid,
      },
      select: {
        amount: true,
        id: true,
        currency: true,
        data: true,
        booking: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    const paymentDataParse = paymentFullSchema.safeParse(payment);

    if (!paymentDataParse.success) {
      throw new Error(`Malformed payment data: ${paymentDataParse.error}`);
    }

    //Get creds from event creator's id.
    const credentialsReq = await prisma.credential.findFirst({
      where: {
        appId: "adyen",
        userId: paymentDataParse.data.booking?.userId,
      },
      select: {
        key: true,
      },
    });

    const credentialsParse = adyenCredentialKeysSchema.safeParse(credentialsReq?.key);

    if (!credentialsParse.success) {
      throw new Error(`Adyen Credentials malformed: ${credentialsParse.error}`);
    }

    console.log({ paymentDataParse });
    const { session, idempotencyKey } = await createPaymentSession({
      credentials: credentialsParse.data,
      payment: paymentDataParse.data,
      shopperEmail: paymentDataParse.data.data.bookerEmail,
    });

    const updatePayment = await prisma.payment.update({
      where: { uid: paymentUid },
      data: {
        data: {
          ...(payment.data as object),
          idempotencyKey,
          session,
        },
        externalId: session.id,
      },
    });

    if (!updatePayment) {
      throw new Error("Payment update failed");
    }

    //Send client-side api key for client-side usage.
    res.status(200).json({
      message: "Payment session updated successfully",
      session,
      clientKey: credentialsParse.data.client_key,
    });
  } catch (_err) {
    const errMsg = _err instanceof Error ? _err.message : _err;
    throw new Error(`Error updating payment session: ${errMsg}`);
  }
}

const requestSchema = z.object({
  paymentUid: z.string(),
});

const paymentFullSchema = z.object({
  id: z.number(),
  amount: z.number(),
  currency: z.string(),
  booking: z.object({
    userId: z.number(),
  }),
  data: adyenPaymentDataSchema,
});
