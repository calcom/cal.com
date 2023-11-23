/* Cron job for scheduled webhook events triggers */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

import { jsonParse } from "./sendPayload";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // get jobs that should be run
  const jobsToRun = await prisma.webhookScheduledTriggers.findMany({
    where: {
      startAfter: {
        lte: dayjs().toISOString(),
      },
    },
  });

  // run jobs
  for (const job of jobsToRun) {
    try {
      await fetch(job.subscriberUrl, {
        method: "POST",
        body: job.payload,
        headers: {
          "Content-Type":
            !job.payload || jsonParse(job.payload) ? "application/json" : "application/x-www-form-urlencoded",
        },
      });
    } catch (error) {
      console.log(`Error running webhook trigger (retry count: ${job.retryCount}): ${error}`);

      // if job fails, retry again for 5 times.
      if (job.retryCount < 5) {
        await prisma.webhookScheduledTriggers.update({
          where: {
            id: job.id,
          },
          data: {
            retryCount: {
              increment: 1,
            },
            startAfter: dayjs()
              .add(5 * (job.retryCount + 1), "minutes")
              .toISOString(),
          },
        });
        return res.json({ ok: false });
      }
    }

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

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
