import type { NextApiRequest, NextApiResponse } from "next";

import { IS_PRODUCTION } from "@calcom/lib/constants";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

import { DeelClient } from "../lib/deelClient";
import { processWebhook } from "../lib/webhookHandler";
import type { DeelWebhookPayload } from "../types";

const log = logger.getSubLogger({ prefix: ["[DeelWebhook]"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }

    const signature = req.headers["x-deel-signature"];
    if (!signature || typeof signature !== "string") {
      throw new HttpCode({ statusCode: 400, message: "Missing x-deel-signature header" });
    }

    const webhookSecret = process.env.DEEL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new HttpCode({ statusCode: 500, message: "Webhook secret not configured" });
    }

    const payload = JSON.stringify(req.body);

    const isValid = DeelClient.verifyWebhookSignature(payload, signature, webhookSecret);
    if (!isValid) {
      throw new HttpCode({ statusCode: 401, message: "Invalid webhook signature" });
    }

    const webhookPayload: DeelWebhookPayload = req.body;

    await processWebhook(webhookPayload);

    return res.status(200).json({ message: "Webhook processed successfully" });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    log.error(`Webhook Error: ${err.message}`);
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}
