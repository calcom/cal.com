import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oooQueriesRouter } from "@calcom/trpc/server/routers/viewer/ooo/queries/_router";

export default createNextApiHandler(oooQueriesRouter);
