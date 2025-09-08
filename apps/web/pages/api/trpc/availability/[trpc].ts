import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { availabilityQueriesRouter } from "@calcom/trpc/server/routers/viewer/availability/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const availabilityRouter = router({
  queries: availabilityQueriesRouter,
});

export default createNextApiHandler(availabilityRouter);
