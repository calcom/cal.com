import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bookingsMutationsRouter } from "@calcom/trpc/server/routers/viewer/bookings/mutations/_router";

export default createNextApiHandler(bookingsMutationsRouter);
