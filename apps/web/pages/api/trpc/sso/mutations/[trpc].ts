import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { ssoMutationsRouter } from "@calcom/trpc/server/routers/viewer/sso/mutations/_router";

export default createNextApiHandler(ssoMutationsRouter);
