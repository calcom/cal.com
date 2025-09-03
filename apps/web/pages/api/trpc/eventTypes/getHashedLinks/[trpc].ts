import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getHashedLinksRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLinks/_router";

export default createNextApiHandler(getHashedLinksRouter);
