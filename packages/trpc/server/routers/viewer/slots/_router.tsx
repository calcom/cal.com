import { router } from "../../../trpc";
import { slotsMutationsRouter } from "./mutations/_router";
import { slotsQueriesRouter } from "./queries/_router";

/** This should be called getAvailableSlots */
export const slotsRouter = router({
  queries: slotsQueriesRouter,
  mutations: slotsMutationsRouter,
});
