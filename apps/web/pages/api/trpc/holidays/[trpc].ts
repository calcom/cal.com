import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { holidaysRouter } from "@calcom/trpc/server/routers/viewer/holidays/_router";

export default createNextApiHandler(holidaysRouter);
