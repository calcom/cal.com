import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";

import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { albyCredentialKeysSchema } from "@calcom/app-store/alby/lib";
import parseInvoice from "@calcom/app-store/alby/lib/parseInvoice";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { ErrorCode } from "@calcom/lib/errorCodes";

import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new ErrorWithCode(ErrorCode.InvalidOperation, "Method Not Allowed");
    }

    const bodyRaw = await getRawBody(req);
    const headers = req.headers;
    const bodyAsString = bodyRaw.toString();

    const parseHeaders = webhookHeadersSchema.safeParse(headers);
    if (!parseHeaders.success) {
      console.error(parseHeaders.error);
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "Bad Request");
    }

    const { data: parsedHeaders } = parseHeaders;

    const parse = eventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "Bad Request");
    }

    const { data: parsedPayload } = parse;

    if (parsedPayload.metadata?.payer_data?.appId !== "cal.com") {
      throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Payment not for cal.com");
    }

    const payment = await prisma.payment.findFirst({
      where: {
        uid: parsedPayload.metadata.payer_data.referenceId,
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
                    type: "alby_payment",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Payment not found");
    const key = payment.booking?.user?.credentials?.[0].key;
    if (!key) throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Credentials not found");

    const parseCredentials = albyCredentialKeysSchema.safeParse(key);
    if (!parseCredentials.success) {
      console.error(parseCredentials.error);
      throw new ErrorWithCode(ErrorCode.InternalServerError, "Credentials not valid");
    }

    const credentials = parseCredentials.data;

    const albyInvoice = await parseInvoice(bodyAsString, parsedHeaders, credentials.webhook_endpoint_secret);
    if (!albyInvoice) throw new ErrorWithCode(ErrorCode.ResourceNotFound, "Invoice not found");
    if (albyInvoice.amount !== payment.amount) {
      throw new ErrorWithCode(ErrorCode.RequestBodyInvalid, "invoice amount does not match payment amount");
    }

    return await handlePaymentSuccess(payment.id, payment.bookingId);
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    return res.status(err.statusCode).send({
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

const metadataSchema = z
  .object({
    payer_data: payerDataSchema,
  })
  .optional();

const eventSchema = z.object({
  metadata: metadataSchema,
});

const webhookHeadersSchema = z
  .object({
    "svix-id": z.string(),
    "svix-timestamp": z.string(),
    "svix-signature": z.string(),
  })
  .passthrough();
