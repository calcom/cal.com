import { router } from "../../../trpc";
import { routingFormsMutationsRouter } from "./mutations/_router";

export const routingFormsRouter = router({
  mutations: routingFormsMutationsRouter,
});
