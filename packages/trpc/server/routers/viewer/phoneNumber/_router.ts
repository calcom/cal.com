import { router } from "../../../trpc";
import { phoneNumberMutationsRouter } from "./mutations/_router";
import { phoneNumberQueriesRouter } from "./queries/_router";

export const phoneNumberRouter = router({
  queries: phoneNumberQueriesRouter,
  mutations: phoneNumberMutationsRouter,
});
