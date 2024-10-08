/* Cron job for cal video no show scheduled webhook events triggers */
import type { NextApiRequest, NextApiResponse } from "next";

import dayjs from "@calcom/dayjs";
import { triggerGuestNoShow } from "@calcom/features/tasker/tasks/triggerNoShow/triggerGuestNoShow";
import { triggerHostNoShow } from "@calcom/features/tasker/tasks/triggerNoShow/triggerHostNoShow";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (process.env.CRON_API_KEY !== apiKey) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  await prisma.webhookScheduledTriggers.deleteMany({
    where: {
      startAfter: {
        lte: dayjs().subtract(1, "day").toDate(),
      },
    },
  });

  // get jobs that should be run
  const jobsToRun = await prisma.webhookScheduledTriggers.findMany({
    where: {
      startAfter: {
        lte: dayjs().toDate(),
      },
      webhook: {
        eventTriggers: {
          hasSome: [
            WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
            WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW,
          ],
        },
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

  const triggerPromises: Promise<any>[] = [];

  // run jobs
  for (const job of jobsToRun) {
    const triggerEvent = JSON.parse(job.payload)?.triggerEvent;

    if (triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW) {
      triggerPromises.push(triggerHostNoShow(job.payload));
    } else if (triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW) {
      triggerPromises.push(triggerGuestNoShow(job.payload));
    }
  }

  await Promise.all(triggerPromises);

  const jobIdsToDelete = jobsToRun.map((job) => job.id);

  await prisma.webhookScheduledTriggers.deleteMany({
    where: {
      id: {
        in: jobIdsToDelete,
      },
    },
  });

  res.json({ ok: true });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
