import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { credentialsMutationsRouter } from "@calcom/trpc/server/routers/viewer/credentials/mutations/_router";

export default createNextApiHandler(credentialsMutationsRouter);
