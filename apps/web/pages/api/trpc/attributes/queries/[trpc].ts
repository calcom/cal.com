import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attributesQueriesRouter } from "@calcom/trpc/server/routers/viewer/attributes/queries/_router";

export default createNextApiHandler(attributesQueriesRouter);
