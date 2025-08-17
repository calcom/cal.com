import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { aiVoiceAgentRouter } from "@calcom/trpc/server/routers/viewer/aiVoiceAgent/_router";

export default createNextApiHandler(aiVoiceAgentRouter);
