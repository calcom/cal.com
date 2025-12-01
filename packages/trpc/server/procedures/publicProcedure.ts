import { errorConversionMiddleware } from "../middlewares/errorConversionMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(errorConversionMiddleware);

export default publicProcedure;
