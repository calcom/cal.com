import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/mutations/_router";

export default createNextApiHandler(calendarsRouter);
