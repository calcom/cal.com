import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import rateLimitMiddleware from "../middlewares/rateLimitMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure
  .use(captureErrorsMiddleware)
  .use(rateLimitMiddleware)
  .use(perfMiddleware);

export default publicProcedure;
