import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attributesMutationsRouter } from "@calcom/trpc/server/routers/viewer/attributes/mutations/_router";

export default createNextApiHandler(attributesMutationsRouter);
