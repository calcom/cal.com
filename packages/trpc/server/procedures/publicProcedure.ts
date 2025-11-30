import { errorMappingMiddleware } from "../middlewares/errorMappingMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(errorMappingMiddleware);

export default publicProcedure;
