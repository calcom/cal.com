import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { listWithTeamRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/listWithTeam/_router";

export default createNextApiHandler(listWithTeamRouter);
