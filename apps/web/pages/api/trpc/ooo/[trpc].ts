import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { oooRouter } from "@calcom/trpc/server/routers/viewer/ooo/_router";

export default createNextApiHandler(oooRouter);
