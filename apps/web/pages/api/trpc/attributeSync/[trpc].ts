import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { attributeSyncRouter } from "@calcom/trpc/server/routers/viewer/attribute-sync/_router";

export default createNextApiHandler(attributeSyncRouter);
