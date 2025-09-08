import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { aiVoiceAgentQueriesRouter } from "@calcom/trpc/server/routers/viewer/aiVoiceAgent/queries/_router";

export default createNextApiHandler(aiVoiceAgentQueriesRouter);
