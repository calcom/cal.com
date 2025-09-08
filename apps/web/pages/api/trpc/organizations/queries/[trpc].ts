import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { organizationsQueriesRouter } from "@calcom/trpc/server/routers/viewer/organizations/queries/_router";

export default createNextApiHandler(organizationsQueriesRouter);
