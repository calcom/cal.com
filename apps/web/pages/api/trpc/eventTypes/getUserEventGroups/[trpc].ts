import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getUserEventGroupsRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getUserEventGroups/_router";

export default createNextApiHandler(getUserEventGroupsRouter);
