import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { adminMutationsRouter } from "@calcom/trpc/server/routers/viewer/admin/mutations/_router";
import { adminQueriesRouter } from "@calcom/trpc/server/routers/viewer/admin/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const adminRouter = router({
  queries: adminQueriesRouter,
  mutations: adminMutationsRouter,
});

export default createNextApiHandler(adminRouter);
