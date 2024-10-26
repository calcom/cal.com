import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { highPerfRouter } from "@calcom/trpc/server/routers/viewer/highPerf/_router";

export default createNextApiHandler(highPerfRouter);
