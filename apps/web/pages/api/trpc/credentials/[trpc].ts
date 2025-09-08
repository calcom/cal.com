import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { credentialsMutationsRouter } from "@calcom/trpc/server/routers/viewer/credentials/mutations/_router";
import { router } from "@calcom/trpc/server/trpc";

const credentialsRouter = router({
  mutations: credentialsMutationsRouter,
});

export default createNextApiHandler(credentialsRouter);
