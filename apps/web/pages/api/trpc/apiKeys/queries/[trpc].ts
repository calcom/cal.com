import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { apiKeysQueriesRouter } from "@calcom/trpc/server/routers/viewer/apiKeys/queries/_router";

export default createNextApiHandler(apiKeysQueriesRouter);
