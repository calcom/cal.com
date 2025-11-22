import perfMiddleware from "../middlewares/perfMiddleware";
import securityMiddleware from "../middlewares/securityMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(securityMiddleware).use(perfMiddleware);

export default publicProcedure;
