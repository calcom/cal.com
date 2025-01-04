import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { domainWideDelegationRouter } from "@calcom/trpc/server/routers/viewer/domainWideDelegation/_router";

export default createNextApiHandler(domainWideDelegationRouter);
