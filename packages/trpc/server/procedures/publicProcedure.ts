import perfMiddleware from "../middlewares/perfMiddleware";
import reactErrorsMiddleware from "../middlewares/redactErrors";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(reactErrorsMiddleware);

export default publicProcedure;
