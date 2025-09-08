import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/queries/_router";

export default createNextApiHandler(calendarsRouter);
