import type { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import * as z from "zod";

import MercadoPago from "@calcom/app-store/mercadopago/lib/MercadoPago";
import { getMercadoPagoAppKeys } from "@calcom/app-store/mercadopago/lib/getMercadoPagoAppKeys";
import type { MercadoPagoUserCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
import { mercadoPagoCredentialSchema } from "@calcom/app-store/mercadopago/lib/mercadoPagoCredentialSchema";
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

export async function handleMercadoPagoPaymentSuccess(payload: z.infer<typeof eventSchema>) {
  // We have MercadoPago payment id from the payload
  const { client_id, client_secret } = await getMercadoPagoAppKeys();

  const mercadoPago = new MercadoPago({ clientId: client_id, clientSecret: client_secret });
  const mercadoPagoPayment = await mercadoPago.getPayment(payload.data.id);

  if (!mercadoPagoPayment) throw new HttpCode({ statusCode: 204, message: "No payment found" });
  if (!mercadoPagoPayment.external_reference)
    throw new HttpCode({ statusCode: 204, message: "Payment without `external_reference` found" });

  // Search the Payment from the MP payment's external_reference
  const payment = await prisma.payment.findFirst({
    where: {
      uid: mercadoPagoPayment.external_reference,
    },
    select: {
      id: true,
      bookingId: true,
      success: true,
      data: true,
    },
  });

  if (!payment?.bookingId) {
    console.error("MercadoPago: Payment Not Found");
    throw new HttpCode({ statusCode: 204, message: "Payment not found" });
  }
  if (!payment?.bookingId) throw new HttpCode({ statusCode: 204, message: "Payment not found" });

  await handlePaymentSuccess(
    payment.id,
    payment.bookingId,
    // @dev Here we are storing the `paymentId` which only available on the webhook event.
    Object.assign({}, payment.data, {
      paymentId: mercadoPagoPayment.id,
    }) as unknown as Prisma.InputJsonValue
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const bodyRaw = await getRawBody(req);
    const bodyAsString = bodyRaw.toString();
    console.log("bodyAsString", JSON.parse(bodyAsString));

    const parse = eventSchema.safeParse(JSON.parse(bodyAsString));
    if (!parse.success) {
      console.error(parse.error);
      throw new HttpCode({ statusCode: 400, message: "Bad Request" });
    }

    const { data: parsedPayload } = parse;

    console.log("parsedPayload", parsedPayload);

    if (parsedPayload.type === "payment" && parsedPayload.action === "payment.created") {
      return await handleMercadoPagoPaymentSuccess(parsedPayload);
    } else {
      throw new HttpCode({
        statusCode: 202,
        message: `Unhandled MercadoPago Webhook event type ${parsedPayload.type} (${parsedPayload.action})`,
      });
    }
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(200).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}

const eventSchema = z.object({
  action: z.enum(["payment.created", "payment.updated"]),
  api_version: z.string(),
  data: z.object({
    id: z.preprocess(String, z.string()),
  }),
  date_created: z.string().datetime(),
  id: z.preprocess(Number, z.number()),
  live_mode: z.boolean(),
  type: z.enum(["payment"]),
  user_id: z.string(),
});

export const findPaymentCredentials = async (
  userId: number
): Promise<MercadoPagoUserCredentialSchema | null> => {
  try {
    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "mercadopago",
        userId,
      },
      select: {
        id: true,
        key: true,
      },
    });

    if (!credentials) {
      throw new Error("No credentials found");
    }

    const parsedCredentials = mercadoPagoCredentialSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      id: credentials.id,
      key: parsedCredentials.data,
    };
  } catch (error) {
    console.error("Error finding MercadoPago payment credentials:", error);
    return null;
  }
};
