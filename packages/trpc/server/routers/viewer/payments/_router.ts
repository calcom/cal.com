import { router } from "../../../trpc";
import { paymentsMutationsRouter } from "./mutations/_router";

export const paymentsRouter = router({
  mutations: paymentsMutationsRouter,
});
