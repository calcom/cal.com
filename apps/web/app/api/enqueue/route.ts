// app/api/enqueue/route.ts
import { NextResponse } from "next/server";

let calendarSyncQueue: Awaited<ReturnType<typeof import("@calid/queue")["getCalendarSyncQueue"]>>;

const getCalendarSyncQueue = async () => {
  if (!calendarSyncQueue) {
    const { getCalendarSyncQueue } = await import("@calid/queue");
    calendarSyncQueue = getCalendarSyncQueue();
    await calendarSyncQueue.waitUntilReady();
  }
  return calendarSyncQueue;
};
export async function GET() {
  const calendarSyncQueue = await getCalendarSyncQueue();
  const job = await calendarSyncQueue.add(
    "calendar-sync-test",
    {
      userId: "121",
      provider: "google",
      syncType: "full",
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 3000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
  return NextResponse.json({
    success: true,
    message: "Job enqueued successfully",
    job: job,
  });
}
