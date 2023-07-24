import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

export default createNextApiHandler(viewerOrganizationsRouter);
