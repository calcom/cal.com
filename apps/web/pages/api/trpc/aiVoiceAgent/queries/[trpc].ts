import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { aiVoiceAgentRouter } from "@calcom/trpc/server/routers/viewer/aiVoiceAgent/queries/_router";

export default createNextApiHandler(aiVoiceAgentRouter);
