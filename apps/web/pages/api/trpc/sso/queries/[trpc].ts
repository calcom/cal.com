import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { ssoQueriesRouter } from "@calcom/trpc/server/routers/viewer/sso/queries/_router";

export default createNextApiHandler(ssoQueriesRouter);
