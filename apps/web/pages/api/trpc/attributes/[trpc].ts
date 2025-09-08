import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attributesMutationsRouter } from "@calcom/trpc/server/routers/viewer/attributes/mutations/_router";
import { attributesQueriesRouter } from "@calcom/trpc/server/routers/viewer/attributes/queries/_router";
import { router } from "@calcom/trpc/server/trpc";

const attributesRouter = router({
  queries: attributesQueriesRouter,
  mutations: attributesMutationsRouter,
});

export default createNextApiHandler(attributesRouter);
