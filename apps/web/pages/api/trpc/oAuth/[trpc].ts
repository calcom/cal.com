import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oAuthRouter } from "@calcom/trpc/server/routers/viewer/oAuth/_router";

export default createNextApiHandler(oAuthRouter);
