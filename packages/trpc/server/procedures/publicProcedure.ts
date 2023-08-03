import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(perfMiddleware).use(captureErrorsMiddleware);

export default publicProcedure;
