import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { routingFormsMutationsRouter } from "@calcom/trpc/server/routers/viewer/routing-forms/mutations/_router";

export default createNextApiHandler(routingFormsMutationsRouter);
