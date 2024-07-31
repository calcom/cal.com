import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure.use(captureErrorsMiddleware).use(perfMiddleware);

export default publicProcedure;
