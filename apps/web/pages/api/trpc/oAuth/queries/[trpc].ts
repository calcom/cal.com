import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oAuthRouter } from "@calcom/trpc/server/routers/viewer/oAuth/queries/_router";

export default createNextApiHandler(oAuthRouter);
