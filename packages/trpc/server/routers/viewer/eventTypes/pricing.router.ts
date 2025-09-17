import { router } from "../../../trpc";
import { getRules, updateRules, calculate } from "./pricing.procedures";

export const pricingRouter = router({
  getRules,
  updateRules,
  calculate,
});
