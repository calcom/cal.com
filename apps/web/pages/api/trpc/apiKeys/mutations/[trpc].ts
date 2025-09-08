import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { apiKeysMutationsRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/mutations/_router";

export default createNextApiHandler(apiKeysMutationsRouter);
