import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";
import { permissionsRouter } from "@calcom/trpc/server/routers/viewer/pbac/_router";

export default createNextApiHandler(permissionsRouter);
