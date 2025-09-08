import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { teamsRouter } from "@calcom/trpc/server/routers/viewer/teams/mutations/_router";

export default createNextApiHandler(teamsRouter);
