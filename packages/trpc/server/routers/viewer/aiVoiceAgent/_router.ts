import { router } from "../../../trpc";
import { aiVoiceAgentMutationsRouter } from "./mutations/_router";
import { aiVoiceAgentQueriesRouter } from "./queries/_router";

export const aiVoiceAgentRouter = router({
  queries: aiVoiceAgentQueriesRouter,
  mutations: aiVoiceAgentMutationsRouter,
});
