import { dbContextMiddleware } from "../middlewares/dbContextMiddleware";
import { errorConversionMiddleware } from "../middlewares/errorConversionMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(dbContextMiddleware).use(perfMiddleware).use(errorConversionMiddleware);

export default publicProcedure;
