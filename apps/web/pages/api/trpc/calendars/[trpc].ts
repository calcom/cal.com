import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calendarsRouter } from "@calcom/trpc/server/routers/viewer/calendars/_router";

export default createNextApiHandler(calendarsRouter);
