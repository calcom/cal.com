import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bookingsMutationsRouter } from "@calcom/trpc/server/routers/viewer/bookings/mutations/_router";
import { bookingsQueriesRouter } from "@calcom/trpc/server/routers/viewer/bookings/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const bookingsRouter = router({
  queries: bookingsQueriesRouter,
  mutations: bookingsMutationsRouter,
});

export default createNextApiHandler(bookingsRouter);
