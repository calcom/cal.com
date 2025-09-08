import { router } from "../../../trpc";
import { credentialsMutationsRouter } from "./mutations/_router";

export const credentialsRouter = router({
  mutations: credentialsMutationsRouter,
});
