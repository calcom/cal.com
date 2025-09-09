import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/queries/_router";

export default createNextApiHandler(meRouter);
