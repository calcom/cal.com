import { router } from "../../../trpc";
import { availabilityQueriesRouter } from "./queries/_router";
import { scheduleRouter } from "./schedule/_router";

export const availabilityRouter = router({
  queries: availabilityQueriesRouter,
  schedule: scheduleRouter,
});
