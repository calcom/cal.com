import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { aiRouter } from "@calcom/trpc/server/routers/viewer/ai/_router";

export default createNextApiHandler(aiRouter);
