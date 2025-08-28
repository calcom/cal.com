import type { Prisma } from "@prisma/client";
import { buffer } from "micro";
//WEBHOOK EVENTS ASSOCIATED EXAMPLE PAYLOADS : https://razorpay.com/docs/webhooks/payloads/payments/
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { default as Razorpay, WebhookEvents } from "@calcom/app-store/razorpay/lib/Razorpay";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import { handlePaymentSuccess } from "@calcom/lib/payment/handlePaymentSuccess";
import { prisma } from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const log = logger.getSubLogger({ prefix: [`[razorpay/api/webhook]`] });

async function detachAppFromEvents(where: Prisma.EventTypeWhereInput) {
  //detaching razorpay from eventtypes, if any
  const eventTypes = await prisma.eventType.findMany({
    where,
  });

  // Iterate over each EventType record
  for (const eventType of eventTypes) {
    const metadata = isPrismaObjOrUndefined(eventType.metadata);

    if (metadata?.apps && isPrismaObjOrUndefined(metadata?.apps)?.razorpay) {
      delete isPrismaObjOrUndefined(metadata.apps)?.razorpay;

      await prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          metadata: metadata,
        },
      });
    }
  }
}

async function handleAppRevoked(accountId: string) {
  const credential = await prisma.credential.findFirst({
    where: {
      key: {
        path: ["account_id"],
        equals: accountId,
      },
      appId: "razorpay",
    },
  });
  if (!credential) throw new HttpCode({ statusCode: 204, message: "No credentials found" });
  const userId = credential.userId;

  if (userId) {
    await detachAppFromEvents({
      metadata: {
        not: undefined,
      },
      userId: userId,
    });
  }

  const teamId = credential.teamId;
  if (teamId) {
    await detachAppFromEvents({
      metadata: {
        not: undefined,
      },
      teamId: teamId,
    });
  }

  //removing the razorpay app from user/team account
  await prisma.credential.delete({
    where: {
      id: credential.id,
    },
  });
}

async function handlePaymentLinkPaid({
  paymentId,
  paymentLinkId,
}: {
  paymentId?: string;
  paymentLinkId?: string;
}) {
  if (!paymentId || !paymentLinkId) throw new HttpCode({ statusCode: 400, message: "Bad Request" });
  const payment = await prisma.payment.findUnique({
    where: { externalId: paymentLinkId },
    select: { id: true, bookingId: true, success: true },
  });
  if (!payment) throw new HttpCode({ statusCode: 404, message: "Payment not found" });

  if (!payment.success) {
    await handlePaymentSuccess(payment.id, payment.bookingId, { paymentId });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    log.info("Received webhook event");
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const rawBody = (await buffer(req)).toString("utf8");
    const signature = req.headers["x-razorpay-signature"];

    const parsedVerifyWebhook = verifyWebhookSchema.safeParse({
      body: rawBody,
      signature: signature,
    });

    if (!parsedVerifyWebhook.success) {
      console.error("Razorpay webhook malformed");
      log.error("Razorpay webhook malformed");
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }
    const isValid = Razorpay.verifyWebhook(parsedVerifyWebhook.data);
    if (!isValid) {
      console.error("Razorpay webhook signature mismatch");
      log.error("Razorpay webhook signature mismatch");
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }
    // Parse the request body
    const parsedBody = JSON.parse(rawBody);
    console.log("razorpay_parsed_body", parsedBody);
    const { event, account_id } = parsedBody;
    switch (event) {
      case WebhookEvents.APP_REVOKED:
        await handleAppRevoked(account_id);
        break;
      case WebhookEvents.PAYMENT_LINK_PAID:
        await handlePaymentLinkPaid({
          paymentId: parsedBody.payload.payment.entity.id,
          paymentLinkId: parsedBody.payload.payment_link.entity.id,
        });
        break;
      default:
        console.error("Razorpay webhook event not handled");
        log.error("Razorpay webhook event not handled");
        throw new HttpCode({ statusCode: 204, message: "No event handler found" });
    }
    // Returning a response to acknowledge receipt of the event
    return res.status(200).end();
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    log.error(`Webhook Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}

const verifyWebhookSchema = z
  .object({
    body: z.string().min(1),
    signature: z.string().min(1),
  })
  .passthrough();
