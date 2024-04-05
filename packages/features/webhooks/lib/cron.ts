/* Cron job for scheduled webhook events triggers */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { createWebhookSignature, jsonParse } from "./sendPayload";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // make sure to not trigger webhooks that are too far in the past (in case cron job was down for a while)
  await prisma.webhookScheduledTriggers.deleteMany({
    where: {
      startAfter: {
        lte: dayjs().subtract(1, "day").toISOString(),
      },
    },
  });

  // get jobs that should be run
  const jobsToRun = await prisma.webhookScheduledTriggers.findMany({
    where: {
      startAfter: {
        lte: dayjs().toISOString(),
      },
    },
    select: {
      id: true,
      jobName: true,
      payload: true,
      subscriberUrl: true,
      webhook: {
        select: {
          secret: true,
        },
      },
    },
  });

  const fetchPromises: Promise<any>[] = [];

  // run jobs
  for (const job of jobsToRun) {
    // Fetch the webhook configuration so that we can get the secret.
    const [appId, subscriberId] = job.jobName.split("_");
    let webhook = job.webhook;

    if (!webhook) {
      try {
        webhook = await prisma.webhook.findUniqueOrThrow({
          where: { id: subscriberId, appId: appId !== "null" ? appId : null },
        });
      } catch {
        logger.error(`Error finding webhook for subscriberId: ${subscriberId}, appId: ${appId}`);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type":
        !job.payload || jsonParse(job.payload) ? "application/json" : "application/x-www-form-urlencoded",
    };

    if (webhook) {
      headers["X-Cal-Signature-256"] = createWebhookSignature({ secret: webhook.secret, body: job.payload });
    }

    fetchPromises.push(
      fetch(job.subscriberUrl, {
        method: "POST",
        body: job.payload,
        headers,
      }).catch((error) => {
        console.error(`Webhook trigger for subscriber url ${job.subscriberUrl} failed with error: ${error}`);
      })
    );

    const parsedJobPayload = JSON.parse(job.payload) as {
      id: number; // booking id
      endTime: string;
      scheduledJobs: string[];
      triggerEvent: string;
    };

    // clean finished job
    await prisma.webhookScheduledTriggers.delete({
      where: {
        id: job.id,
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: parsedJobPayload.id },
      select: { id: true, scheduledJobs: true },
    });
    if (!booking) {
      console.log("Error finding booking in webhook trigger:", parsedJobPayload);
      return res.json({ ok: false });
    }

    //remove scheduled job from bookings once triggered
    const updatedScheduledJobs = booking.scheduledJobs.filter((scheduledJob) => {
      return scheduledJob !== job.jobName;
    });

    await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        scheduledJobs: updatedScheduledJobs,
      },
    });
  }

  Promise.allSettled(fetchPromises);

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
