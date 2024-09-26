import type { NextApiRequest, NextApiResponse } from "next";
// import getRawBody from "raw-body";
import { z } from "zod";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";

// import prisma from "@calcom/prisma";

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
    const headers = req.headers;
    const bodyAsString = bodyRaw.toString();
    console.log("hitpay wehbook bodyRaw =>", bodyRaw);
    console.log("hitpay webhook bodyAsString =>", bodyAsString);
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
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
