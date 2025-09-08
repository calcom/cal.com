import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { googleWorkspaceRouter } from "@calcom/trpc/server/routers/viewer/googleWorkspace/queries/_router";

export default createNextApiHandler(googleWorkspaceRouter);
