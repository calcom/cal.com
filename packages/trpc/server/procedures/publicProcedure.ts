import perfMiddleware from "../middlewares/perfMiddleware";
import tenantMiddleware from "../middlewares/tenantMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(tenantMiddleware);

export default publicProcedure;
