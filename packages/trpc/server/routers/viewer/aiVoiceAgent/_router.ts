import { router } from "../../../trpc";
import { aiVoiceAgentRouter } from "./mutations/_router";
import { aiVoiceAgentRouter } from "./queries/_router";

export const aiVoiceAgentRouter = router({
  queries: aiVoiceAgentRouter,
  mutations: aiVoiceAgentRouter,
});
