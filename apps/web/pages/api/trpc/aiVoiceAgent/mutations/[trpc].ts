import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { aiVoiceAgentMutationsRouter } from "@calcom/trpc/server/routers/viewer/aiVoiceAgent/mutations/_router";

export default createNextApiHandler(aiVoiceAgentMutationsRouter);
