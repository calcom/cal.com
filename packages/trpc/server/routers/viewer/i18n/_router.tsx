import { router } from "../../../trpc";
import { i18nQueriesRouter } from "./queries/_router";

export const i18nRouter = router({
  queries: i18nQueriesRouter,
});
