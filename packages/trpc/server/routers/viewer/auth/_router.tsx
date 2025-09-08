import { router } from "../../../trpc";
import { authMutationsRouter } from "./mutations/_router";

export const authRouter = router({
  mutations: authMutationsRouter,
});
