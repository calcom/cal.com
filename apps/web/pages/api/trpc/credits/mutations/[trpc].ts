import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { creditsMutationsRouter } from "@calcom/trpc/server/routers/viewer/credits/mutations/_router";

export default createNextApiHandler(creditsMutationsRouter);
