import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { ssoRouter } from "@calcom/trpc/server/routers/viewer/sso/mutations/_router";

export default createNextApiHandler(ssoRouter);
