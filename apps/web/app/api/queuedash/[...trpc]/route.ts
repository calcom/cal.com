// import { getCalendarSyncQueue } from "@calid/queue";
import { appRouter } from "@queuedash/api";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const { getCalendarSyncQueue } = await import("@calid/queue");

  return fetchRequestHandler({
    endpoint: "/api/queuedash",
    req,
    router: appRouter,
    // allowBatching: true,
    createContext: () =>
      ({
        queues: [
          {
            queue: getCalendarSyncQueue(),
            displayName: "Calendar Sync Queue",
            type: "bullmq" as const,
          },
        ],
      } as never),
  });
}

export { handler as GET, handler as POST };
