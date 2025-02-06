import { wrapApiHandlerWithSentry } from "@sentry/nextjs";

import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { highPerfRouter } from "@calcom/trpc/server/routers/viewer/highPerf/_router";

export default wrapApiHandlerWithSentry(createNextApiHandler(highPerfRouter), "/api/trpc/highPerf/[trpc]");
