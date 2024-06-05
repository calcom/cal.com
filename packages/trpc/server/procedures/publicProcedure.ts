import captureErrorsMiddleware from "../middlewares/captureErrorsMiddleware";
import perfMiddleware from "../middlewares/perfMiddleware";
import verifyTokenMiddleware from "../middlewares/verifyTokenMiddleware";
import { tRPCContext } from "../trpc";

const publicProcedure = tRPCContext.procedure
  .use(captureErrorsMiddleware)
  .use(perfMiddleware)
  .use(verifyTokenMiddleware);

export default publicProcedure;
