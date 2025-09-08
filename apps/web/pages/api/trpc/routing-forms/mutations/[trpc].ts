import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { routingFormsRouter } from "@calcom/trpc/server/routers/viewer/routing-forms/mutations/_router";

export default createNextApiHandler(routingFormsRouter);
