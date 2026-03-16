import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { unifiedCalendarRouter } from "@calcom/trpc/server/routers/viewer/unifiedCalendar/_router";

export default createNextApiHandler(unifiedCalendarRouter);
