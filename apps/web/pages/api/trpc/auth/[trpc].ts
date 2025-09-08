import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { authMutationsRouter } from "@calcom/trpc/server/routers/viewer/auth/mutations/_router";
import { router } from "@calcom/trpc/server/trpc";

const authRouter = router({
  mutations: authMutationsRouter,
});

export default createNextApiHandler(authRouter);
