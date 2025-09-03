import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { getHashedLinkRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLink/_router";

export default createNextApiHandler(getHashedLinkRouter);
