import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { policyRouter } from "@calcom/trpc/server/routers/viewer/policy/_router";

export default createNextApiHandler(policyRouter);
