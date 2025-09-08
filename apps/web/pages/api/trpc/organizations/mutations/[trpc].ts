import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { organizationsMutationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/mutations/_router";

export default createNextApiHandler(organizationsMutationsRouter);
