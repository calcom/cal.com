import { buildJobId, JobName } from "@calid/job-dispatcher";
import { QueueName } from "@calid/queue";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dispatcher from "@lib/job-disptacher";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const getCurrentQuarterBucket = (): number => Math.floor(Date.now() / FIFTEEN_MINUTES_MS);

async function postHandler(request: NextRequest) {
  const apiKey = request.headers.get("authorization") || request.nextUrl.searchParams.get("apiKey");

  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const bucket = getCurrentQuarterBucket();
  const job = await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: {
      name: JobName.CALENDAR_SYNC,
      action: "renewSubscription",
      reason: "scheduled",
    },
    bullmqOptions: {
      jobId: buildJobId(["calendarSync", "renewSubscription", bucket]),
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
        count: 2000,
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    action: "renewSubscription",
    bucket,
    job,
  });
}

export const POST = defaultResponderForAppDir(postHandler);
