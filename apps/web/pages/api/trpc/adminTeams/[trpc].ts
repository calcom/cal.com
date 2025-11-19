import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { adminTeamsRouter } from "@calcom/trpc/server/routers/viewer/adminTeams/_router";

export default createNextApiHandler(adminTeamsRouter);
