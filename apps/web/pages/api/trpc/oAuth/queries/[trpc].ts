import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oAuthQueriesRouter } from "@calcom/trpc/server/routers/viewer/oAuth/queries/_router";

export default createNextApiHandler(oAuthQueriesRouter);
