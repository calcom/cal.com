import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";

export default createNextApiHandler(bookingsRouter);
