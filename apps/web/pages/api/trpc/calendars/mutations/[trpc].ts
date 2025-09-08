import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsMutationsRouter } from "@calcom/trpc/server/routers/viewer/calendars/mutations/_router";

export default createNextApiHandler(calendarsMutationsRouter);
