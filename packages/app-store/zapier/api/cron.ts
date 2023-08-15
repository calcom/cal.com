/* Cron job for scheduled zapier events triggers */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // get jobs that should be ran
  const jobsToRun = await prisma.zapierScheduledTriggers.findMany({
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
      });
    } catch (error) {
      console.log(`Error running zapier trigger (${job.retryCount} retries): ${error}`);

      // if job fails, retry again for 5 times.
      if (job.retryCount <= 5) {
        return await prisma.zapierScheduledTriggers.update({
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
      }
    }

    const parsedJobPayload = JSON.parse(job.payload) as {
      id: number; //booking id
      endTime: string;
      scheduledJobs: string[];
      triggerEvent: string;
    };

    // clean finished job
    await prisma.zapierScheduledTriggers.delete({
      where: {
        id: job.id,
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: parsedJobPayload.id },
      select: { id: true, scheduledJobs: true },
    });
    if (!booking) {
      console.log(`Error finding booking in zapier trigger:`, parsedJobPayload);
      return;
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
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
