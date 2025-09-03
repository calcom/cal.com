import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getTeamAndEventTypeOptionsRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getTeamAndEventTypeOptions/_router";

export default createNextApiHandler(getTeamAndEventTypeOptionsRouter);
