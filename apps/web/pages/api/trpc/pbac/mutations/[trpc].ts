import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { pbacMutationsRouter } from "@calcom/trpc/server/routers/viewer/pbac/mutations/_router";

export default createNextApiHandler(pbacMutationsRouter);
