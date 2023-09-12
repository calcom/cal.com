import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { apiKeysRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/_router";

export default createNextApiHandler(apiKeysRouter);
