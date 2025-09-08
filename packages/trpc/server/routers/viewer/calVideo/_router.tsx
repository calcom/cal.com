import { router } from "../../../trpc";
import { calVideoQueriesRouter } from "./queries/_router";

export const calVideoRouter = router({
  queries: calVideoQueriesRouter,
});
