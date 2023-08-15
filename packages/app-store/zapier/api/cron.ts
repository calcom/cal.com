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

  const finishedJobs: number[] = [];
  // run jobs
  for (const job of jobsToRun) {
    try {
      await fetch(job.subscriberUrl, {
        method: "POST",
        body: job.payload,
      });
      finishedJobs.push(job.id);
    } catch (error) {
      // if job fails, retry for 5 times.
      if (job.retryCount <= 5) {
        await prisma.zapierScheduledTriggers.update({
          where: {
            id: job.id,
          },
          data: {
            retryCount: {
              increment: 1,
            },
          },
        });
      } else {
        finishedJobs.push(job.id);
      }

      console.log(`Error running zapier trigger (${job.retryCount} retries): ${error}`);
    }
  }

  // delete finished jobs
  await prisma.zapierScheduledTriggers.deleteMany({
    where: {
      id: { in: finishedJobs },
    },
  });

  // //remove scheduled job from bookings once triggered
  // const updatedScheduledJobs = booking.scheduledJobs.filter((scheduledJob) => {
  //   return scheduledJob !== jobName;
  // });

  // await prisma.booking.update({
  //   where: {
  //     id: booking.id,
  //   },
  //   data: {
  //     scheduledJobs: updatedScheduledJobs,
  //   },
  // });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
