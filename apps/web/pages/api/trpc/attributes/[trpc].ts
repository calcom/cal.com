import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attributesRouter } from "@calcom/trpc/server/routers/viewer/attributes/_router";

export default createNextApiHandler(attributesRouter);
