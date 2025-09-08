import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { adminMutationsRouter } from "@calcom/trpc/server/routers/viewer/admin/mutations/_router";

export default createNextApiHandler(adminMutationsRouter);
