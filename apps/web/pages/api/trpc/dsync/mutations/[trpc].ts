import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { dsyncRouter } from "@calcom/trpc/server/routers/viewer/dsync/mutations/_router";

export default createNextApiHandler(dsyncRouter);
