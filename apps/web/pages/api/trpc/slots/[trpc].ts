import { wrapApiHandlerWithSentry } from "@sentry/nextjs";

import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { slotsRouter } from "@calcom/trpc/server/routers/viewer/slots/_router";

export default wrapApiHandlerWithSentry(createNextApiHandler(slotsRouter, "/api/trpc/slots/[trpc]"));
