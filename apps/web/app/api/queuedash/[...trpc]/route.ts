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
    queues = [
      {
        queue: getCalendarSyncQueue(),
        displayName: "Calendar Sync Queue",
        type: "bullmq",
      },
    ];
  }
  return queues;
}

async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/queuedash",
    req,
    router: appRouter,
    createContext: async () => ({ queues: await getQueues() } as never),
  });
}

export { handler as GET, handler as POST };
