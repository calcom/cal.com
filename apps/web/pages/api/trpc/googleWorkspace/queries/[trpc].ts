import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { googleWorkspaceQueriesRouter } from "@calcom/trpc/server/routers/viewer/googleWorkspace/queries/_router";

export default createNextApiHandler(googleWorkspaceQueriesRouter);
