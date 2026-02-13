import { appRouter } from "@queuedash/api";
import type { Queue } from "bullmq";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let queues: {
  queue: Queue;
  displayName: string;
  type: "bullmq";
}[];

async function getQueues() {
  if (!queues) {
    const { getDefaultQueue, getDataSyncQueue, getScheduledQueue } = await import("@calid/queue");
    const defaultQueue = getDefaultQueue();
    const dataSyncQueue = getDataSyncQueue();
    const scheduledQueue = getScheduledQueue();
    await Promise.all([
      defaultQueue.waitUntilReady(),
      dataSyncQueue.waitUntilReady(),
      scheduledQueue.waitUntilReady(),
    ]);
    queues = [
      {
        queue: defaultQueue,
        displayName: "Default Queue",
        type: "bullmq",
      },
      {
        queue: dataSyncQueue,
        displayName: "Data Sync Queue",
        type: "bullmq",
      },
      {
        queue: scheduledQueue,
        displayName: "Scheduled Queue",
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
