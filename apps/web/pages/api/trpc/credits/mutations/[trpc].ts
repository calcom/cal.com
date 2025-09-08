import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { creditsRouter } from "@calcom/trpc/server/routers/viewer/credits/mutations/_router";

export default createNextApiHandler(creditsRouter);
