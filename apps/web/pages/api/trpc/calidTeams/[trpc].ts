import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calIdTeamsRouter } from "@calcom/trpc/server/routers/viewer/calidTeams/_router";

export default createNextApiHandler(calIdTeamsRouter);
