import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { creditsQueriesRouter } from "@calcom/trpc/server/routers/viewer/credits/queries/_router";

export default createNextApiHandler(creditsQueriesRouter);
