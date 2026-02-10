import { appRouter } from "@queuedash/api";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let queues: {
  queue: Awaited<ReturnType<typeof import("@calid/queue")["getCalendarSyncQueue"]>>;
  displayName: string;
  type: "bullmq";
}[];

async function getQueues() {
  if (!queues) {
    const { getCalendarSyncQueue } = await import("@calid/queue");
    const calendarSyncQueue = getCalendarSyncQueue();
    await calendarSyncQueue.waitUntilReady();
    queues = [
      {
        queue: calendarSyncQueue,
        displayName: "Calendar Sync Queue",
        type: "bullmq",
      },
    ];
  }
  return queues;
}

async function handler(req: Request) {
  try {
    return fetchRequestHandler({
      endpoint: "/api/queuedash",
      req,
      router: appRouter,
      createContext: async () => ({ queues: await getQueues() } as never),
    });
  } catch (error) {
    console.error("QueueDash handler error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}

export { handler as GET, handler as POST };
