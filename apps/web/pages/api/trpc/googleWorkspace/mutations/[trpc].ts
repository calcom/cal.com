import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { googleWorkspaceMutationsRouter } from "@calcom/trpc/server/routers/viewer/googleWorkspace/mutations/_router";

export default createNextApiHandler(googleWorkspaceMutationsRouter);
