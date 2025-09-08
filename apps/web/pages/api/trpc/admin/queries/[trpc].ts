import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { adminQueriesRouter } from "@calcom/trpc/server/routers/viewer/admin/queries/_router";

export default createNextApiHandler(adminQueriesRouter);
