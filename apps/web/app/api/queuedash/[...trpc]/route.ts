import { getCalendarSyncQueue } from "@calid/queue";
import { appRouter } from "@queuedash/api";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

function handler(req: Request) {
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
