import { handlePaymentSuccess } from "@calcom/app-store/_utils/payments/handlePaymentSuccess";
import { paypalCredentialKeysSchema } from "@calcom/app-store/paypal/lib";
import Paypal from "@calcom/app-store/paypal/lib/Paypal";
import { IS_PRODUCTION } from "@calcom/lib/constants";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { distributedTracing } from "@calcom/lib/tracing/factory";
import prisma from "@calcom/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { z } from "zod";
import appConfig from "../config.json";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function handlePaypalPaymentSuccess(
  payload: z.infer<typeof eventSchema>,
  rawPayload: string,
  webhookHeaders: WebHookHeadersType
) {
  const payment = await prisma.payment.findFirst({
    where: {
      externalId: payload?.resource?.id,
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
    },
  });

  if (!booking) throw new HttpCode({ statusCode: 204, message: "No booking found" });
  // Probably booking it's already paid from /capture but we need to send confirmation email
  const foundCredentials = await findPaymentCredentials(booking.id);
  if (!foundCredentials) throw new HttpCode({ statusCode: 204, message: "No credentials found" });
  const { webhookId, ...credentials } = foundCredentials;

  const paypalClient = new Paypal(credentials);
  await paypalClient.getAccessToken();
  await paypalClient.verifyWebhook({
    body: {
      auth_algo: webhookHeaders["paypal-auth-algo"],
      cert_url: webhookHeaders["paypal-cert-url"],
      transmission_id: webhookHeaders["paypal-transmission-id"],
      transmission_sig: webhookHeaders["paypal-transmission-sig"],
      transmission_time: webhookHeaders["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: rawPayload,
    },
  });

  const traceContext = distributedTracing.createTrace("paypal_webhook", {
    meta: { paymentId: payment.id, bookingId: payment.bookingId },
  });
  return await handlePaymentSuccess({
    paymentId: payment.id,
    bookingId: payment.bookingId,
    appSlug: appConfig.slug,
    traceContext,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const bodyRaw = await getRawBody(req);
    const headers = req.headers;
    const bodyAsString = bodyRaw.toString();

    const parseHeaders = webhookHeadersSchema.safeParse(headers);
    if (!parseHeaders.success) {
      console.error(parseHeaders.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }
    const parse = eventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;

    if (parsedPayload.event_type === "CHECKOUT.ORDER.APPROVED") {
      return await handlePaypalPaymentSuccess(parsedPayload, bodyAsString, parseHeaders.data);
    }
  } catch (_err) {
    const err = getServerErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.cause?.stack,
    });
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).end();
}

const resourceSchema = z
  .object({
    create_time: z.string(),
    id: z.string(),
    payment_source: z.object({
      paypal: z.object({}).optional(),
    }),
    intent: z.string(),
    payer: z.object({
      email_address: z.string(),
      payer_id: z.string(),
      address: z.object({
        country_code: z.string(),
      }),
    }),
    status: z.string().optional(),
  })
  .passthrough();

const eventSchema = z
  .object({
    id: z.string(),
    create_time: z.string(),
    resource_type: z.string(),
    event_type: z.string(),
    summary: z.string(),
    resource: resourceSchema,
    status: z.string().optional(),
    event_version: z.string(),
    resource_version: z.string(),
  })
  .passthrough();

const webhookHeadersSchema = z
  .object({
    "paypal-auth-algo": z.string(),
    "paypal-cert-url": z.string(),
    "paypal-transmission-id": z.string(),
    "paypal-transmission-sig": z.string(),
    "paypal-transmission-time": z.string(),
  })
  .passthrough();

type WebHookHeadersType = z.infer<typeof webhookHeadersSchema>;

export const findPaymentCredentials = async (
  bookingId: number
): Promise<{ clientId: string; secretKey: string; webhookId: string }> => {
  try {
    // @TODO: what about team bookings with paypal?
    const userFromBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!userFromBooking) throw new Error("No user found");

    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "paypal",
        userId: userFromBooking?.userId,
      },
      select: {
        key: true,
      },
    });
    if (!credentials) {
      throw new Error("No credentials found");
    }
    const parsedCredentials = paypalCredentialKeysSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      clientId: parsedCredentials.data.client_id,
      secretKey: parsedCredentials.data.secret_key,
      webhookId: parsedCredentials.data.webhook_id,
    };
  } catch (err) {
    console.error(err);
    return {
      clientId: "",
      secretKey: "",
      webhookId: "",
    };
  }
};
