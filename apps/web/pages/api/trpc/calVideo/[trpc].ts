import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calVideoQueriesRouter } from "@calcom/trpc/server/routers/viewer/calVideo/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const calVideoRouter = router({
  queries: calVideoQueriesRouter,
});

export default createNextApiHandler(calVideoRouter);
