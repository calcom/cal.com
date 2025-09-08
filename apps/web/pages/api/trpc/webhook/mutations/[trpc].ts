import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { webhookRouter } from "@calcom/trpc/server/routers/viewer/webhook/mutations/_router";

export default createNextApiHandler(webhookRouter);
