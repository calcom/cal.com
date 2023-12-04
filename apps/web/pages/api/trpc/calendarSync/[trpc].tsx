import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarSyncRouter } from "@calcom/trpc/server/routers/viewer/calendarSync/_router";

export default createNextApiHandler(calendarSyncRouter);
