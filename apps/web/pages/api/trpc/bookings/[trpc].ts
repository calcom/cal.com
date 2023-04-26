import { bookingsRouter } from "@calcom/trpc/server/routers/viewer/bookings/_router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(bookingsRouter);
