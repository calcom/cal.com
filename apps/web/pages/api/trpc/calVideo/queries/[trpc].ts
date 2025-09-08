import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { calVideoRouter } from "@calcom/trpc/server/routers/viewer/calVideo/queries/_router";

export default createNextApiHandler(calVideoRouter);
