import { VitalClient } from "@tryvital/vital-node";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";

import { getErrorFromUnknown } from "@calcom/lib/errors";

import { IS_PRODUCTION } from "@lib/config/constants";
import { HttpError as HttpCode } from "@lib/core/http/error";

const client = new VitalClient({
  client_id: process.env.VITAL_CLIENT_ID || "",
  client_secret: process.env.VITAL_CLIENT_SECRET || "",
  environment: "sandbox",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const getOuraSleepScore = async (user_id: string, bedtime_start: Date) => {
  const sleep_data = await client.Sleep.get_raw(user_id, bedtime_start, undefined, "oura");
  if (sleep_data.sleep.length === 0) {
    throw Error("No sleep score found");
  }
  return +sleep_data.sleep[0].data.score;
};

/**
 * This is will generate a user token for a client_user_id`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
    }
    const sig = req.headers["svix-signature"];
    if (!sig) {
      throw new HttpCode({ statusCode: 400, message: "Missing svix-signature" });
    }
    const requestBuffer = await buffer(req);
    const payload = requestBuffer.toString();
    const event: any = client.Webhooks.constructWebhookEvent(
      payload,
      req.headers as Record<string, string>,
      process.env.VITAL_WEBHOOK_SECRET as string
    );
    if (event.event_type == "daily.data.sleep.created") {
      // Carry out logic here to determine what to do if sleep is less
      // than 8 hours or readiness score is less than 70

      // If you want to target a specific provider data you can do something like this
      if (event.data.source.slug == "oura") {
        try {
          const sleepScore = await getOuraSleepScore(event.user_id, event.data.bedtime_start);
          if (sleepScore < 70) {
            // Reschedule the calendar events
          }
        } catch (e) {
          console.log("Failed to get sleep score");
        }
      }
    }
    return res.status(200).json({ body: req.body });
  } catch (_err) {
    const err = getErrorFromUnknown(_err);
    console.error(`Webhook Error: ${err.message}`);
    res.status(err.statusCode ?? 500).send({
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
    });
    return;
  }
}
