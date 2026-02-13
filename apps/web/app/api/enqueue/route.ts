import { JobName, QueueName } from "@calid/queue";
// app/api/enqueue/route.ts
import { NextResponse } from "next/server";

import dispatcher from "@lib/job-disptacher";

export async function GET() {
  const jobResult = await dispatcher.dispatch({
    queue: QueueName.DATA_SYNC,
    name: JobName.CALENDAR_SYNC,
    data: {
      userId: "121",
      provider: "google",
      syncType: "full",
    },
  });
  return NextResponse.json({
    success: true,
    message: "Job enqueued successfully",
    job: jobResult,
  });
}
