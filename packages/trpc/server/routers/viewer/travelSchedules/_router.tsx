import { router } from "../../../trpc";
import { travelSchedulesQueriesRouter } from "./queries/_router";

export const travelSchedulesRouter = router({
  queries: travelSchedulesQueriesRouter,
});
