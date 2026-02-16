import dayjs from "@calcom/dayjs";
import { INNGEST_ID } from "@calcom/lib/constants";
import type { PrismaClient } from "@calcom/prisma";
import { inngestClient } from "@calcom/web/pages/api/inngest";

export async function handleWebhookScheduledTriggers(prisma: PrismaClient) {
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
        lte: dayjs().add(1, "hour").toISOString(),
        gte: dayjs().subtract(1, "day").toDate(),
      },
      scheduled: false,
    },
    select: {
      id: true,
      jobName: true,
      startAfter: true,
      payload: true,
      subscriberUrl: true,
      webhook: {
        select: {
          secret: true,
        },
      },
    },
  });

  const key = INNGEST_ID === "onehash-cal" ? "prod" : "stag";

  let scheduledJobs = 0;

  // run jobs
  for (const job of jobsToRun) {
    const now = new Date();
    const delay = Math.max(0, job.startAfter.getTime() - now.getTime());

    console.log(
      "Sending Inngest scheduling event for Webhook trigger: ",
      delay > 0 ? now.getTime() + delay : undefined
    );

    const { ids } = await inngestClient.send({
      name: `webhook/schedule.trigger-${key}`,
      data: {
        id: job.id,
      },
      ts: delay > 0 ? now.getTime() + delay : undefined,
    });

    await prisma.webhookScheduledTriggers.update({
      where: {
        id: job.id,
      },
      data: {
        scheduled: true,
      },
    });

    scheduledJobs++;
  }

  return { scheduledJobs };
}
