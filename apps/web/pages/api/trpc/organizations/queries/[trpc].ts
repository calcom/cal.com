import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { organizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/queries/_router";

export default createNextApiHandler(organizationsRouter);
