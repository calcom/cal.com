import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { pbacRouter } from "@calcom/trpc/server/routers/viewer/pbac/queries/_router";

export default createNextApiHandler(pbacRouter);
