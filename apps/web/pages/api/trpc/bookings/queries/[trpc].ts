import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bookingsQueriesRouter } from "@calcom/trpc/server/routers/viewer/bookings/queries/_router";

export default createNextApiHandler(bookingsQueriesRouter);
