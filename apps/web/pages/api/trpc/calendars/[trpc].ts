import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsMutationsRouter } from "@calcom/trpc/server/routers/viewer/calendars/mutations/_router";
import { calendarsQueriesRouter } from "@calcom/trpc/server/routers/viewer/calendars/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const calendarsRouter = router({
  queries: calendarsQueriesRouter,
  mutations: calendarsMutationsRouter,
});

export default createNextApiHandler(calendarsRouter);
