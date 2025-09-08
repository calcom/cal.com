import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { teamsQueriesRouter } from "@calcom/trpc/server/routers/viewer/teams/queries/_router";

export default createNextApiHandler(teamsQueriesRouter);
