import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oAuthMutationsRouter } from "@calcom/trpc/server/routers/viewer/oAuth/mutations/_router";

export default createNextApiHandler(oAuthMutationsRouter);
