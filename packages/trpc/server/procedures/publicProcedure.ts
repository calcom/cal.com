import { t } from "@calcom/trpc/server/trpc";

import { perfMiddleware } from "../middlewares/perfMiddleware";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";

export const publicProcedure = t.procedure.use(sessionMiddleware).use(perfMiddleware);
