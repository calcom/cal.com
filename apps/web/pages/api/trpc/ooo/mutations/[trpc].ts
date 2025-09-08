import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oooMutationsRouter } from "@calcom/trpc/server/routers/viewer/ooo/mutations/_router";

export default createNextApiHandler(oooMutationsRouter);
